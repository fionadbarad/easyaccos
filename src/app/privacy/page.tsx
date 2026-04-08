import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Privacy Policy | EasyAcco',
  description: 'How EasyAcco collects, uses, and protects your personal data under UK GDPR and the Data Protection Act 2018.',
  openGraph: {
    title: 'Privacy Policy | EasyAcco',
    description: 'How EasyAcco collects, uses, and protects your personal data under UK GDPR.',
    url: 'https://www.easyacco.uk/privacy',
    siteName: 'EasyAcco',
    type: 'website',
  },
}

const C = {
  bg:     '#020617',
  card:   '#0F172A',
  gold:   '#EAB308',
  text:   '#E5E7EB',
  muted:  'rgba(229,231,235,0.6)',
  border: 'rgba(234,179,8,0.12)',
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: '2.5rem' }}>
      <h2 style={{
        fontFamily: 'var(--font-playfair)', color: C.gold,
        fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.85rem',
        paddingBottom: '0.5rem', borderBottom: `1px solid ${C.border}`,
      }}>
        {title}
      </h2>
      <div style={{ color: C.muted, fontSize: '0.9rem', lineHeight: 1.8 }}>
        {children}
      </div>
    </section>
  )
}

export default function PrivacyPage() {
  return (
    <div style={{ background: C.bg, minHeight: '100vh', color: C.text }}>

      {/* Nav */}
      <nav style={{
        borderBottom: `1px solid ${C.border}`,
        padding: '1rem 1.5rem',
        display: 'flex', alignItems: 'center', gap: '1rem',
      }}>
        <Link href="/" style={{ fontFamily: 'var(--font-playfair)', color: C.gold, fontSize: '1.2rem', fontWeight: 700, textDecoration: 'none' }}>
          EasyAcco
        </Link>
        <span style={{ color: C.muted, fontSize: '0.8rem' }}>/ Privacy Policy</span>
      </nav>

      <main style={{ maxWidth: '760px', margin: '0 auto', padding: 'clamp(2rem,5vw,4rem) clamp(1.5rem,5vw,2rem)' }}>

        {/* Header */}
        <div style={{ marginBottom: '3rem' }}>
          <p style={{ color: C.gold, fontSize: '0.7rem', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
            Legal
          </p>
          <h1 style={{ fontFamily: 'var(--font-playfair)', fontSize: 'clamp(1.8rem,4vw,2.5rem)', fontWeight: 700, color: C.text, marginBottom: '0.75rem' }}>
            Privacy Policy
          </h1>
          <p style={{ color: C.muted, fontSize: '0.875rem' }}>
            Last updated: <strong style={{ color: C.text }}>8 April 2026</strong>
          </p>
          <div style={{ marginTop: '1rem', padding: '0.85rem 1.1rem', background: 'rgba(234,179,8,0.06)', border: `1px solid rgba(234,179,8,0.2)`, borderRadius: '8px', color: C.muted, fontSize: '0.83rem', lineHeight: 1.7 }}>
            This policy explains how EasyAcco (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;) collects, uses, stores, and protects your personal data in accordance with the <strong style={{ color: C.text }}>UK General Data Protection Regulation (UK GDPR)</strong> and the <strong style={{ color: C.text }}>Data Protection Act 2018</strong>.
          </div>
        </div>

        <Section title="1. Who We Are">
          <p>
            EasyAcco is a free UK tax estimation and financial literacy platform available at{' '}
            <strong style={{ color: C.text }}>www.easyacco.uk</strong>. EasyAcco is operated independently and is not registered as a financial advisory firm. We are the data controller for the personal information described in this policy.
          </p>
          <p style={{ marginTop: '0.75rem' }}>
            For data protection enquiries, contact us at:{' '}
            <strong style={{ color: C.text }}>privacy@easyacco.uk</strong>
          </p>
        </Section>

        <Section title="2. What Data We Collect">
          <p style={{ marginBottom: '0.75rem' }}>We collect two categories of data depending on how you use the platform:</p>

          <p style={{ marginBottom: '0.4rem' }}><strong style={{ color: C.text }}>A. Guest users (no account)</strong></p>
          <p style={{ marginBottom: '0.75rem' }}>
            If you use EasyAcco without creating an account, we do <strong style={{ color: C.text }}>not</strong> collect any personally identifiable information. Tax figures you enter are processed entirely in your browser and are never sent to our servers.
          </p>

          <p style={{ marginBottom: '0.4rem' }}><strong style={{ color: C.text }}>B. Registered users (optional account)</strong></p>
          <p>
            If you create an account to save your data, we collect:
          </p>
          <ul style={{ marginTop: '0.5rem', paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <li>Email address (used for authentication only)</li>
            <li>Display name (optional, provided by you)</li>
            <li>Income and expense figures you choose to save</li>
            <li>Account creation date and last login timestamp</li>
          </ul>
          <p style={{ marginTop: '0.75rem' }}>
            We do <strong style={{ color: C.text }}>not</strong> collect: payment details, National Insurance numbers, UTR numbers, or any HMRC credentials.
          </p>
        </Section>

        <Section title="3. How We Use Your Data">
          <p style={{ marginBottom: '0.5rem' }}>We use your data only for the following purposes:</p>
          <ul style={{ paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <li><strong style={{ color: C.text }}>Authentication</strong> — to log you in and keep your session secure</li>
            <li><strong style={{ color: C.text }}>Data persistence</strong> — to save income and expense records you choose to store</li>
            <li><strong style={{ color: C.text }}>Service improvement</strong> — anonymised, aggregated analytics via Vercel Analytics (no individual tracking)</li>
            <li><strong style={{ color: C.text }}>Security</strong> — to detect and prevent abuse of the platform</li>
          </ul>
          <p style={{ marginTop: '0.75rem' }}>
            We do <strong style={{ color: C.text }}>not</strong> sell, share, or rent your personal data to third parties. We do not use your data for marketing or profiling.
          </p>
        </Section>

        <Section title="4. Legal Basis for Processing (UK GDPR Article 6)">
          <ul style={{ paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <li><strong style={{ color: C.text }}>Contractual necessity</strong> (Art. 6(1)(b)) — processing your account data to provide the service you signed up for</li>
            <li><strong style={{ color: C.text }}>Legitimate interests</strong> (Art. 6(1)(f)) — anonymised analytics to improve platform performance</li>
            <li><strong style={{ color: C.text }}>Consent</strong> (Art. 6(1)(a)) — where you explicitly provide optional information (e.g. display name)</li>
          </ul>
        </Section>

        <Section title="5. Data Storage & Security">
          <p style={{ marginBottom: '0.75rem' }}>
            Account data is stored securely using <strong style={{ color: C.text }}>Supabase</strong>, which is hosted on AWS infrastructure in the European Economic Area (EEA). Supabase is compliant with EU/UK GDPR and SOC 2 Type II.
          </p>
          <p style={{ marginBottom: '0.75rem' }}>
            All data is transmitted over <strong style={{ color: C.text }}>HTTPS/TLS</strong>. Passwords are never stored — we use email-based magic links or OAuth. Database access is restricted by row-level security (RLS) policies, meaning you can only access your own records.
          </p>
          <p>
            Guest-mode tax calculations are performed locally in your browser. No financial data from guest sessions is transmitted to or stored on our servers.
          </p>
        </Section>

        <Section title="6. Cookies & Tracking">
          <p style={{ marginBottom: '0.75rem' }}>
            EasyAcco uses a minimal set of cookies:
          </p>
          <ul style={{ paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <li><strong style={{ color: C.text }}>Authentication cookies</strong> — session tokens set by Supabase to keep you logged in (strictly necessary)</li>
            <li><strong style={{ color: C.text }}>Analytics</strong> — Vercel Analytics collects anonymised page-view data with no cross-site tracking and no personal identifiers</li>
          </ul>
          <p style={{ marginTop: '0.75rem' }}>
            We do not use advertising cookies, third-party trackers, or fingerprinting technologies.
          </p>
        </Section>

        <Section title="7. Data Retention">
          <ul style={{ paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <li><strong style={{ color: C.text }}>Account data</strong> — retained for as long as your account is active, then deleted within 30 days of account closure</li>
            <li><strong style={{ color: C.text }}>Financial records you save</strong> — deleted immediately upon account closure or on request</li>
            <li><strong style={{ color: C.text }}>Server logs</strong> — retained for up to 90 days for security purposes, then deleted</li>
            <li><strong style={{ color: C.text }}>Guest sessions</strong> — no data retained (processed in-browser only)</li>
          </ul>
        </Section>

        <Section title="8. Your Rights Under UK GDPR">
          <p style={{ marginBottom: '0.75rem' }}>As a data subject you have the right to:</p>
          <ul style={{ paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <li><strong style={{ color: C.text }}>Access</strong> — request a copy of all personal data we hold about you</li>
            <li><strong style={{ color: C.text }}>Rectification</strong> — correct inaccurate or incomplete data</li>
            <li><strong style={{ color: C.text }}>Erasure</strong> (&ldquo;right to be forgotten&rdquo;) — request deletion of your data</li>
            <li><strong style={{ color: C.text }}>Restriction</strong> — limit how we process your data in certain circumstances</li>
            <li><strong style={{ color: C.text }}>Portability</strong> — receive your data in a machine-readable format</li>
            <li><strong style={{ color: C.text }}>Objection</strong> — object to processing based on legitimate interests</li>
            <li><strong style={{ color: C.text }}>Withdraw consent</strong> — at any time where processing is consent-based</li>
          </ul>
          <p style={{ marginTop: '0.85rem' }}>
            To exercise any of these rights, email <strong style={{ color: C.text }}>privacy@easyacco.uk</strong>. We will respond within <strong style={{ color: C.text }}>30 days</strong> as required by UK GDPR.
          </p>
        </Section>

        <Section title="9. Third-Party Services">
          <ul style={{ paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <li><strong style={{ color: C.text }}>Supabase</strong> — authentication and database storage. <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" style={{ color: C.gold }}>Privacy Policy</a></li>
            <li><strong style={{ color: C.text }}>Vercel</strong> — hosting and anonymised analytics. <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" style={{ color: C.gold }}>Privacy Policy</a></li>
          </ul>
          <p style={{ marginTop: '0.75rem' }}>
            No other third parties receive your personal data.
          </p>
        </Section>

        <Section title="10. International Transfers">
          <p>
            Supabase stores data within the EEA. Vercel may process anonymised analytics data outside the UK under appropriate safeguards (Standard Contractual Clauses). No identifiable personal data is transferred outside the UK/EEA.
          </p>
        </Section>

        <Section title="11. Children">
          <p>
            EasyAcco is not directed at children under 13. We do not knowingly collect personal data from anyone under 13. If you believe a child has provided us with personal data, contact us at <strong style={{ color: C.text }}>privacy@easyacco.uk</strong> and we will delete it promptly.
          </p>
        </Section>

        <Section title="12. Complaints">
          <p>
            If you believe we have not handled your personal data lawfully, you have the right to lodge a complaint with the <strong style={{ color: C.text }}>Information Commissioner&rsquo;s Office (ICO)</strong>:
          </p>
          <ul style={{ marginTop: '0.5rem', paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <li>Website: <a href="https://ico.org.uk" target="_blank" rel="noopener noreferrer" style={{ color: C.gold }}>ico.org.uk</a></li>
            <li>Helpline: 0303 123 1113</li>
          </ul>
        </Section>

        <Section title="13. Changes to This Policy">
          <p>
            We may update this policy from time to time. Material changes will be communicated to registered users by email. The &ldquo;Last updated&rdquo; date at the top of this page will always reflect the most recent version.
          </p>
        </Section>

        {/* Footer nav */}
        <div style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: `1px solid ${C.border}`, display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/" style={{ color: C.gold, fontSize: '0.875rem', textDecoration: 'none' }}>← Back to EasyAcco</Link>
          <div style={{ display: 'flex', gap: '1.5rem' }}>
            <Link href="/security" style={{ color: C.muted, fontSize: '0.8rem', textDecoration: 'none' }}>Security</Link>
            <Link href="/dashboard" style={{ color: C.muted, fontSize: '0.8rem', textDecoration: 'none' }}>Dashboard</Link>
          </div>
        </div>
      </main>
    </div>
  )
}
