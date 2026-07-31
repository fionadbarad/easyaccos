import type { Metadata } from 'next'
import Link from 'next/link'

import { C } from '@/styles/palette'
import { T } from '@/styles/type'

export const metadata: Metadata = {
  title: 'Privacy Notice — EasyAcco',
  description:
    'How EasyAcco collects, uses, stores and shares personal data, the lawful bases for doing so, who it is shared with, and your rights under UK GDPR.',
}

// ─────────────────────────────────────────────────────────────────────────────
// ACCURACY IS THE POINT OF THIS PAGE.
//
// Every processor named below is one the code actually contacts. If you add,
// remove or change an outbound integration, change this page in the same
// commit — an inaccurate privacy notice is itself a UK GDPR Art. 5(1)(a)
// breach, which is the failure mode this page was written to fix. Grep for
// `https://` under src/ to re-derive the list.
//
// !! BEFORE PUBLISHING: the three [[ ]] placeholders below must be filled in
// with the real data-controller identity and contact route. They are not
// something software can invent — see docs/COMPLIANCE.md.
// ─────────────────────────────────────────────────────────────────────────────

const CONTROLLER_NAME = '[[CONTROLLER LEGAL NAME]]'
const CONTROLLER_ADDRESS = '[[CONTROLLER REGISTERED ADDRESS]]'
// Defaulted to the address already published on /security so this page is never
// left with no route to a human. A role address (privacy@easyacco.uk) reads
// better to a reviewer than a personal mailbox — worth switching before filing.
const CONTACT_EMAIL = 'baradfiona14@gmail.com'

const LAST_UPDATED = '31 July 2026'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: '2.5rem' }}>
      <h2
        style={{
          color: C.white,
          fontSize: T.title,
          fontWeight: 700,
          margin: '0 0 0.75rem',
          letterSpacing: '-0.02em',
        }}
      >
        {title}
      </h2>
      <div style={{ color: C.muted, fontSize: T.body, lineHeight: 1.7 }}>{children}</div>
    </section>
  )
}

function Row({ who, what, why, where }: { who: string; what: string; why: string; where: string }) {
  return (
    <tr style={{ borderTop: `1px solid ${C.border}` }}>
      <td style={{ padding: '10px 12px 10px 0', color: C.white, verticalAlign: 'top' }}>{who}</td>
      <td style={{ padding: '10px 12px 10px 0', verticalAlign: 'top' }}>{what}</td>
      <td style={{ padding: '10px 12px 10px 0', verticalAlign: 'top' }}>{why}</td>
      <td style={{ padding: '10px 0', verticalAlign: 'top' }}>{where}</td>
    </tr>
  )
}

export default function PrivacyPage() {
  return (
    <main
      style={{
        background: C.bg,
        minHeight: '100vh',
        padding: 'clamp(2rem,5vw,4rem) clamp(1.5rem,5vw,3rem)',
      }}
    >
      <div style={{ maxWidth: '820px', margin: '0 auto' }}>
        <h1
          style={{
            color: C.white,
            fontSize: T.display,
            fontWeight: 700,
            letterSpacing: '-0.03em',
            margin: '0 0 0.5rem',
          }}
        >
          Privacy Notice
        </h1>
        <p style={{ color: C.dim, fontSize: T.meta, margin: '0 0 2.5rem' }}>
          Last updated {LAST_UPDATED}
        </p>

        <Section title="Who is responsible for your data">
          <p style={{ margin: '0 0 0.75rem' }}>
            {CONTROLLER_NAME} (&ldquo;EasyAcco&rdquo;, &ldquo;we&rdquo;) is the data controller for
            the personal data described here. Our registered address is {CONTROLLER_ADDRESS}.
          </p>
          <p style={{ margin: 0 }}>
            For any question about this notice, or to exercise the rights set out below, contact{' '}
            <span style={{ color: C.white }}>{CONTACT_EMAIL}</span>. We respond to rights requests
            within one month, as UK GDPR requires.
          </p>
        </Section>

        <Section title="What we collect">
          <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
            <li style={{ marginBottom: '0.5rem' }}>
              <strong style={{ color: C.white }}>Account data</strong> — your email address, and an
              account identifier. Collected when you sign up.
            </li>
            <li style={{ marginBottom: '0.5rem' }}>
              <strong style={{ color: C.white }}>Financial records you enter</strong> —
              transactions, expenses, invoices, mileage journeys and the figures you type into the
              tax tools. This is the substance of the service.
            </li>
            <li style={{ marginBottom: '0.5rem' }}>
              <strong style={{ color: C.white }}>Tax identifiers</strong> — where you use the Making
              Tax Digital features, your National Insurance number and/or VAT registration number,
              entered by you for the purpose of filing.
            </li>
            <li style={{ marginBottom: '0.5rem' }}>
              <strong style={{ color: C.white }}>Device and connection data</strong> — where you
              submit to HMRC, HMRC&rsquo;s Fraud Prevention Headers specification obliges us to send
              them your public IP address, device identifier, screen dimensions, window size,
              timezone and browser user-agent string. This is a legal requirement of using their
              API; we cannot file without it.
            </li>
            <li style={{ marginBottom: 0 }}>
              <strong style={{ color: C.white }}>Change history</strong> — an audit log of creates,
              updates and deletions against your records, so that changes to accounting data are
              traceable.
            </li>
          </ul>
        </Section>

        <Section title="We do not track you">
          <p style={{ margin: '0 0 0.75rem' }}>
            EasyAcco embeds no analytics SDKs, tracking pixels, advertising networks or behavioural
            profiling of any kind. There is nothing to opt out of because there is nothing running.
          </p>
          <p style={{ margin: 0 }}>
            The only browser storage we use is strictly necessary: a session cookie to keep you
            signed in, an encrypted IndexedDB store holding your own records on your own device, and
            — where you have connected HMRC — an encrypted, HttpOnly cookie holding your HMRC access
            tokens. Under PECR reg. 6(4) strictly necessary storage does not require consent, which
            is why you are not asked for any.
          </p>
        </Section>

        <Section title="Who we share it with">
          <p style={{ margin: '0 0 1rem' }}>
            We do not sell personal data, and we do not share it for anyone else&rsquo;s marketing.
            The only recipients are the processors below, each used solely to deliver the service:
          </p>
          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: T.meta,
                color: C.muted,
                minWidth: '620px',
              }}
            >
              <thead>
                <tr>
                  {['Recipient', 'What they receive', 'Why', 'Where'].map((h) => (
                    <th
                      key={h}
                      scope="col"
                      style={{
                        textAlign: 'left',
                        color: C.dim,
                        fontWeight: 600,
                        padding: '0 12px 8px 0',
                        fontSize: T.caption,
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <Row
                  who="HMRC"
                  what="The figures on the return you choose to file, your tax identifier, and the Fraud Prevention Headers described above"
                  why="To file your return. Sent only when you actively submit"
                  where="UK"
                />
                <Row
                  who="Supabase"
                  what="Your account email and the financial records you save to the cloud"
                  why="Database and authentication hosting"
                  where="See current region in your project settings"
                />
                <Row
                  who="Vercel"
                  what="Standard server request logs, including IP address"
                  why="Application hosting and delivery"
                  where="Global edge network"
                />
                <Row
                  who="Google (Gemini API)"
                  what="The question you type into the AI adviser, plus your financial position expressed only as a RANGE (for example “£45,000–£50,000”), never an exact figure"
                  why="To generate the answer. Used only if you use the AI adviser"
                  where="Google Cloud"
                />
              </tbody>
            </table>
          </div>
          <p style={{ margin: '1rem 0 0' }}>
            The AI adviser deliberately generalises your figures into bands before they leave our
            servers, so that an exact income — which is a financial fingerprint — is never
            transmitted. This is data minimisation under Art. 5(1)(c) applied at the point of
            disclosure. If you would rather share nothing with Google, do not use the AI adviser;
            every other feature works without it.
          </p>
          <p style={{ margin: '0.75rem 0 0' }}>
            The currency converter calls an external exchange-rate service. That request asks only
            for public rates and carries none of your data.
          </p>
        </Section>

        <Section title="Our lawful bases">
          <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
            <li style={{ marginBottom: '0.5rem' }}>
              <strong style={{ color: C.white }}>Contract</strong> (Art. 6(1)(b)) — holding and
              processing the records you enter, so we can provide the service you signed up for.
            </li>
            <li style={{ marginBottom: '0.5rem' }}>
              <strong style={{ color: C.white }}>Legal obligation</strong> (Art. 6(1)(c)) — sending
              the Fraud Prevention Headers HMRC mandates for API filing.
            </li>
            <li style={{ marginBottom: 0 }}>
              <strong style={{ color: C.white }}>Legitimate interests</strong> (Art. 6(1)(f)) —
              keeping the audit log and applying rate limits, so accounting changes are traceable
              and the service is not abused. We have balanced this against your interests and
              consider the impact minimal.
            </li>
          </ul>
        </Section>

        <Section title="How long we keep it">
          <p style={{ margin: 0 }}>
            Records stay while your account is open. Delete your account and we erase the associated
            records; note that anything already filed with HMRC is held by HMRC under their own
            retention rules and cannot be withdrawn by us. Records held only on your device are
            removed when you clear the site&rsquo;s data in your browser.
          </p>
        </Section>

        <Section title="Your rights">
          <p style={{ margin: '0 0 0.75rem' }}>
            You have the right to access your data, correct it, erase it, restrict or object to its
            processing, and to receive it in a portable form. The Settings page includes an export
            that produces your complete records as a file, so portability does not require you to
            ask us.
          </p>
          <p style={{ margin: 0 }}>
            If you believe we have handled your data improperly you can complain to the Information
            Commissioner&rsquo;s Office at{' '}
            <a
              href="https://ico.org.uk/make-a-complaint/"
              style={{ color: C.white, textDecoration: 'underline' }}
            >
              ico.org.uk
            </a>
            , though we would rather you raised it with us first so we can put it right.
          </p>
        </Section>

        <Section title="Security">
          <p style={{ margin: 0 }}>
            Records held on your device are encrypted with AES-GCM. HMRC tokens are held in
            encrypted, HttpOnly cookies that JavaScript cannot read. Cloud records are protected by
            row-level security policies so one account cannot read another&rsquo;s. There is more
            detail on the{' '}
            <Link href="/security" style={{ color: C.white, textDecoration: 'underline' }}>
              security page
            </Link>
            .
          </p>
        </Section>

        <p style={{ color: C.dim, fontSize: T.meta, marginTop: '3rem' }}>
          EasyAcco is independent software. It is not produced, endorsed or approved by HM Revenue
          &amp; Customs.{' '}
          <Link href="/" style={{ color: C.muted, textDecoration: 'underline' }}>
            Back to EasyAcco
          </Link>
        </p>
      </div>
    </main>
  )
}
