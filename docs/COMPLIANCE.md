# HMRC Production Credentials — Remediation Record

Application: **easyacco.uk** · Submitted June 2026 · Declined 31 July 2026

This document tracks each reason HMRC gave, what was changed in response, and —
importantly — what is **still outstanding and cannot be closed in code**. Take it
to the re-submission; a reviewer who can see the reasoning is easier to satisfy
than one who has to infer it.

---

## 1. Penetration testing — MANDATORY — 🟡 IN PROGRESS (tool route started)

> _"Your application has not passed software penetration testing. **You can use
> either penetration test tools or an independent third party supplier.** For
> penetration testing methodologies read the National Cyber Security Centre
> Penetration Guide."_

**Read that middle sentence again.** HMRC gives two routes and treats them as
alternatives. A third-party engagement is the stronger evidence, but a tool-based
assessment is explicitly permitted, and for a solo developer the difference is
roughly £2,000–£8,000 against roughly £0. This item was previously written up as
though only the supplier route existed. It does not.

### The routes, honestly compared

|                  | Tools (Route A)                                                                                                                            | Third-party supplier (Route B)                                          |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| Indicative cost  | £0                                                                                                                                         | ~£2,000–£8,000 for an app this size; get three quotes, they vary wildly |
| Time             | Days                                                                                                                                       | Weeks, mostly waiting for a slot                                        |
| Finds            | Known-vulnerable dependencies, missing headers, TLS misconfiguration, injection patterns, common misconfigurations                         | All of that, plus **business-logic flaws**                              |
| Misses           | **Authorisation logic.** No scanner knows that user A should not be able to read user B's ledger — it has no idea what "should" means here | Less, but nothing finds everything                                      |
| Evidence quality | Adequate if the methodology and dates are stated                                                                                           | Strongest                                                               |

**The recommendation: do Route A now, and re-apply on it.** If HMRC comes back
still unsatisfied, you will have lost nothing and you will know Route B is
actually required before spending on it. Do not spend £2,000 on a maybe.

### The one thing tools cannot cover

Cross-account access is the highest-severity risk in this application and the
one no scanner will test. It is worth testing **by hand** before submitting, and
it takes an afternoon:

1. Create two accounts, A and B, in separate browser profiles.
2. As A, note the record IDs the app uses.
3. As B, try to read, update and delete A's records — through the UI, then by
   replaying A's API requests with B's session cookie.
4. Every one of those must fail. Screenshot the failures. That evidence is
   directly relevant to HMRC's concern about customers' data, and it is the part
   of your report a reviewer will actually care about.

Supabase row-level security is the only control standing between these two
accounts. Prove it holds rather than assuming it.

### What is already in place

- **`.github/workflows/security.yml`** runs the automated part continuously —
  dependency advisories (blocking, at high severity, production tree only),
  CodeQL with the extended security queries, and Semgrep against the OWASP Top
  Ten, TypeScript, React and secrets rulesets. Each job documents what it proves
  and what it does not.
- **`.github/dependabot.yml`** opens the patch PRs, so "we scan" is backed by
  something that actually closes what the scan finds.
- **Production dependency tree is clean** — 0 advisories across 583 packages. Two
  of them (postcss, sharp) needed version overrides because Next pins them below
  their patched releases; npm's own `--force` remediation for those was to
  install next@9.3.3.
- A full Content-Security-Policy ships (item 4). Its absence is one of the first
  things any scanner reports.
- The security defects found in the July audit passes are fixed and
  regression-tested — token handling, session identity, input validation on the
  HMRC submission routes, and the storage layer. See `docs/AUDIT.md`.
- `docs/PENTEST-SCOPE.md` has the manual commands (OWASP ZAP baseline and full
  scan, testssl.sh, header scoring, Supabase's own security advisors), the
  evidence pack HMRC needs, and the scope a supplier would ask for on day one if
  you do go that way.

**Your next actions:** work through the checklist in `docs/PENTEST-SCOPE.md`
under "Route A", then triage the first Semgrep baseline and turn that job
blocking. Until the baseline is triaged, the workflow is evidence that scanning
happens — not evidence that it came back clean. Do not describe it as the latter.

> Note: Supabase and Vercel are third-party platforms. Both have their own rules
> about testing against their infrastructure. Scope the test to **your
> application**, and say so explicitly in the report.

---

## 2. HMRC logos and branding — MANDATORY — ✅ DONE

> _"You must not use HMRC logos in your software, marketing or website."_

No HMRC logo image files existed in the repository — the problem was **wording
that implied endorsement**. Changed:

| Where                            | Before                                     | After                                                     |
| -------------------------------- | ------------------------------------------ | --------------------------------------------------------- |
| `LandingPage.tsx` hero badge     | `HMRC-Accurate`                            | `2026/27 Rates`                                           |
| `LandingPage.tsx` trust list     | `verified against official guidance`       | `Calculations follow published HMRC guidance for 2026/27` |
| `mileage/layout.tsx` page title  | `HMRC Approved Mileage Claim Tool`         | `UK Business Mileage Claims 2026/27`                      |
| `mileage/page.tsx` panel heading | `HMRC Approved Mileage Rates 2026/27`      | `Approved Mileage Allowance Payments (AMAP) 2026/27`      |
| `mileage/page.tsx` subtitle      | `HMRC approved mileage — 2026/27 tax year` | `AMAP rates — 2026/27 tax year`                           |

The distinction being drawn: describing **the rates** as HMRC-approved is factual
— "Approved Mileage Allowance Payments" is HMRC's own statutory term. Placing
"HMRC" in a badge beside the product name, or in a title next to the word "Tool",
reads as HMRC having approved **the software**. That is what the rules forbid.

An explicit non-affiliation statement now appears on the landing page footer, the
security page and the privacy notice:

> EasyAcco is independent software. It is not produced, endorsed or approved by
> HM Revenue & Customs.

**Check the live site too.** This covers the repository. If easyacco.uk carries
any marketing asset not in this codebase — an OG image, a social banner, a
screenshot showing HMRC branding — it needs the same treatment.

---

## 3. Sharing personal data without consent — MANDATORY — ✅ DONE (one manual step left)

> _"You must not share customers' personal data without their consent."_

The audit found something worse than a missing consent prompt — a **false public
statement about processing**:

- `/security` told visitors: _"No Third-Party Analytics — EasyAcco does not embed
  tracking pixels, analytics SDKs, or ad networks."_
- `layout.tsx` unconditionally loaded **Vercel Analytics and Speed Insights** on
  every route, including authenticated `/dashboard` pages, before any consent.
- The cookie banner linked to `/privacy`, which **did not exist** — a 404.
- The banner was **never mounted anywhere**, so no consent was ever collected.
- The scripts loaded were the `script.debug.js` debug builds, in production.

An inaccurate description of processing is a UK GDPR Art. 5(1)(a) transparency
failure in its own right; loading non-essential storage before consent is a PECR
reg. 6 breach.

**Resolution — analytics removed entirely.** `@vercel/analytics` and
`@vercel/speed-insights` are uninstalled and the component deleted. The existing
"no third-party analytics" claim is now true, and the app runs on strictly
necessary storage only, which PECR reg. 6(4) exempts from consent. That is a far
simpler position to defend than a consent-gate a reviewer has to take on trust.

The dead `CookieConsent` component was deleted rather than wired up: with no
non-essential storage there is nothing to consent to, and a banner implying
otherwise is its own inaccuracy.

**A real privacy notice now exists at `/privacy`**, linked from the landing
footer and the security page. It names every processor the code actually
contacts — **HMRC, Supabase and Vercel** — with what each receives, why, and the
lawful basis, and records that receipt OCR runs in-browser so photos never leave
the device.

(Google Gemini was named here in the first pass. It no longer appears, because
the AI features that reached it are now switched off — see below. The list in
`/privacy` and the set of integrations the code actually has must never drift
apart; that drift is what caused this rejection.)

### AI features switched off (follow-up to this item)

The privacy work above disclosed Google (Gemini) as a processor, because the AI
Tax Advisory chat and the expense "suggest category" button sent user text — and
a banded summary of their financial position — to Google.

Those features are now **disabled by default**, and with them the last third-party
recipient of customer data. Your answer to HMRC's data-sharing question is now
simply: **data goes to Supabase (our own storage) and to HMRC when you file, and
to nobody else.** There is nothing left to defend.

Two reasons this was worth doing rather than merely disclosing:

1. It was the only route by which customer financial data reached a third party.
   Everything else in the app is the user, Supabase and HMRC.
2. The assistant introduced itself as _"your personal tax advisor"_ while the
   site disclaims giving advice ("Not financial advice", "Estimates only"). For
   software seeking HMRC recognition that inconsistency is a reviewer's gift.

**How it is switched off** — `src/lib/ai-enabled.ts`, driven by
`NEXT_PUBLIC_EA_AI` (default off):

- Both API routes (`/api/ai/chat`, `/api/ai/categorise`) return **404** before
  reading the body and before any outbound call. This is the part that matters:
  hiding buttons would leave the routes deployed and directly callable — and
  `/api/ai/categorise` needs no session — so the privacy notice would have been
  true of the interface and false of the service.
- The sidebar nav entry, sidebar call-to-action, dashboard tile, both ✨ suggest
  buttons, the landing-page feature card, the sign-up pitch and the SEO
  description are all removed.
- `/dashboard/ai` redirects to `/dashboard/learn` so existing links still land
  somewhere useful.
- `/privacy` and `/security` no longer name Google. **If AI is ever re-enabled,
  those disclosures must be restored in the same change** — the flag and the
  disclosure move together, or the notice becomes inaccurate in the other
  direction.

Receipt OCR is unaffected: it runs in the browser via Tesseract and never sent
anything anywhere.

Covered by `src/lib/__tests__/ai-disabled.test.ts`, which asserts the routes 404
without making an outbound call, that a present `GEMINI_API_KEY` does not
re-open them, and that the gate runs before body parsing. Verified failing when
the gate is removed.

### Controller identity — ✅ filled in

`src/app/privacy/page.tsx` named `[[CONTROLLER LEGAL NAME]]` and
`[[CONTROLLER REGISTERED ADDRESS]]` to every visitor until this was done. It now
names Fiona Barad as controller, with an email contact route.

**Deliberately no postal address.** Art. 13(1)(a) requires "the identity and the
contact details of the controller" — contact details, not a street. A monitored
email satisfies it, and the ICO's guidance for sole traders is that a data
subject must be able to reach the controller, not that the controller must
publish where they live. EasyAcco is run from home; `/privacy` is public,
indexed and archived permanently. The notice invites anyone who needs a postal
route to ask for one, which is the ordinary way this is handled.

Add an address here if a business one ever exists — a virtual office, or a
registered office on incorporation. It strengthens the notice. Do not add a home
one.

A role address (`privacy@easyacco.uk`) would still read better to a reviewer
than a personal mailbox, and is worth setting up before filing.

`src/lib/__tests__/privacy-notice.test.ts` guards both halves: it fails if a
placeholder returns, and it fails if a UK postcode appears anywhere in the page.

**Also confirm:** if you are a UK data controller processing personal data
electronically you very likely need to be **registered with the ICO** and paying
the data protection fee. Check at `ico.org.uk/registration`. A reviewer may look
you up.

**On the ICO Direct Marketing guidance HMRC cited:** no marketing or mailing-list
capture was found in this codebase. If you send any marketing email — from a
newsletter tool, a launch list, anything outside this repository — it needs its
own opt-in consent, and it must not be bundled with signing up for the service.

---

## 4. WCAG 2.2 level AA — ADVISORY — 🔶 PARTIAL

> _"Web-based software must meet level AA of the Web Content Accessibility Guidelines."_

HMRC flag this as optional, but it is the item most likely to become mandatory
later, and public-sector-adjacent software is judged on it. A first pass has been
made (see the accessibility commit); the codebase has structural issues that need
a dedicated effort rather than a sweep — chiefly that colour is used heavily on a
dark palette where several muted greys fall below the 4.5:1 contrast minimum.

This is honestly reported as partial. Do not claim AA conformance until it has
been tested with a screen reader and an automated pass (axe DevTools or similar).

---

## Also fixed alongside: unexplained load failure

You reported a traffic spike (largely US-origin) around 29 July that the site
struggled with, and a Vercel score of 55.

A likely contributor was found and fixed: `middleware.ts` called
`supabase.auth.getUser()` — a blocking round-trip to Supabase's auth server — on
**every** `/dashboard/*` request, including from visitors with no session at all.
Crawlers and scanners hitting dashboard URLs each cost one upstream auth call,
which is how a burst turns into connection-pool exhaustion and 5xx responses for
the signed-in users who actually needed it.

The middleware now checks for a Supabase auth cookie first and returns
immediately when there is none. Unauthenticated traffic no longer touches the
auth server.

Note that the "Vercel score" you saw **was** Speed Insights' Real Experience
Score. With Speed Insights removed for the reasons above, that number will stop
reporting — the underlying performance is unchanged and should be measured with
Lighthouse or WebPageTest instead.

---

## Summary

| #   | Item                    | Status                                                                 |
| --- | ----------------------- | ---------------------------------------------------------------------- |
| 1   | Penetration testing     | 🟡 Tool route started (£0) — **run it and test cross-account by hand** |
| 2   | HMRC logos / branding   | ✅ Done — verify live marketing assets too                             |
| 3   | Personal data & consent | ✅ Done — **fill controller placeholders**, check ICO registration     |
| 4   | WCAG AA                 | 🔶 Partial — needs a dedicated pass                                    |
