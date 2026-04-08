import type { Metadata } from 'next'
import { Shield, Zap, Lock, Eye, Server, Globe } from 'lucide-react'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Security',
  description: 'How EasyAcco keeps your data safe — end-to-end encryption, Supabase row-level security, HTTPS, and privacy-first architecture.',
  openGraph: {
    title: 'Security | EasyAcco',
    description: 'How EasyAcco keeps your data safe with encryption, row-level security, and privacy-first design.',
    url: 'https://www.easyacco.uk/security',
  },
}

const C = {
  bg:    '#0B0E1A',
  card:  '#111827',
  gold:  '#FFD700',
  text:  '#E5E7EB',
  muted: 'rgba(229,231,235,0.55)',
  border:'rgba(255,215,0,0.12)',
}

function Pillar({ icon: Icon, title, body }: { icon: React.ElementType; title: string; body: string }) {
  return (
    <div style={{
      background: C.card, border: `1px solid ${C.border}`, borderRadius: '10px',
      padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.65rem',
    }}>
      <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'rgba(255,215,0,0.08)', border: `1px solid rgba(255,215,0,0.2)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={20} style={{ color: C.gold }} />
      </div>
      <h3 style={{ color: C.gold, fontFamily: 'var(--font-playfair)', fontSize: '1rem', fontWeight: 700, margin: 0 }}>{title}</h3>
      <p style={{ color: C.muted, fontSize: '0.85rem', lineHeight: 1.65, margin: 0 }}>{body}</p>
    </div>
  )
}

export default function SecurityPage() {
  return (
    <div style={{ background: C.bg, minHeight: '100vh', padding: 'clamp(2rem,5vw,4rem) clamp(1.5rem,5vw,3rem)' }}>
      <div style={{ maxWidth: '820px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
          <div style={{ width: '52px', height: '52px', borderRadius: '12px', background: 'rgba(255,215,0,0.08)', border: `1px solid rgba(255,215,0,0.25)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Shield size={26} style={{ color: C.gold }} />
          </div>
          <div>
            <h1 style={{ fontFamily: 'var(--font-playfair)', color: C.text, fontSize: 'clamp(1.6rem,3.5vw,2.2rem)', fontWeight: 700, margin: 0 }}>
              Security &amp; Privacy
            </h1>
            <p style={{ color: C.muted, fontSize: '0.875rem', margin: '4px 0 0' }}>
              How EasyAcco handles your financial data
            </p>
          </div>
        </div>

        {/* Hero statement */}
        <div style={{
          background: 'rgba(255,215,0,0.06)', border: `1px solid rgba(255,215,0,0.2)`,
          borderRadius: '10px', padding: '1.5rem', marginBottom: '2.5rem',
        }}>
          <p style={{ color: C.text, fontSize: '1rem', lineHeight: 1.7, margin: 0 }}>
            <strong style={{ color: C.gold }}>EasyAcco processes all tax calculations at the edge</strong> — your financial numbers never touch our servers. All estimations run entirely in your browser. We only store data when you explicitly choose to save it, and only after you authenticate with Google.
          </p>
        </div>

        {/* Security pillars */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: '1rem', marginBottom: '2.5rem' }}>
          <Pillar icon={Zap} title="Edge-First Calculations"
            body="Every tax calculation runs client-side in your browser or at the Vercel edge. No calculation data is transmitted to or stored on our servers." />
          <Pillar icon={Eye} title="Zero Storage by Default"
            body="In Guest Mode, nothing is persisted beyond your local browser session. We have no record of your income, expenses, or tax figures." />
          <Pillar icon={Lock} title="Consent-Gated Persistence"
            body="Data is only saved to Supabase when you sign in and explicitly trigger a Save or Export action. You are always in control." />
          <Pillar icon={Server} title="Supabase Infrastructure"
            body="Where data is stored, it lives in Supabase — SOC 2 Type II compliant, encrypted at rest (AES-256) and in transit (TLS 1.3)." />
          <Pillar icon={Globe} title="No Third-Party Analytics"
            body="EasyAcco does not embed tracking pixels, analytics SDKs, or ad networks. Your browsing behaviour on this platform is not monetised." />
          <Pillar icon={Shield} title="Auth via Google OAuth"
            body="Authentication is handled by Supabase Auth with Google OAuth 2.0. We never see or store your Google password." />
        </div>

        {/* What we store */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '10px', padding: '1.5rem', marginBottom: '2rem' }}>
          <h2 style={{ fontFamily: 'var(--font-playfair)', color: C.gold, fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>
            What We Store (Only After Sign-In)
          </h2>
          {[
            ['Email address', 'Required for account identification via Supabase Auth'],
            ['Saved transactions', 'Only if you use the Save feature — encrypted at rest'],
            ['Display name', 'Optional, editable in Settings at any time'],
          ].map(([field, desc]) => (
            <div key={field} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: `1px solid rgba(255,215,0,0.06)`, gap: '1rem' }}>
              <span style={{ color: C.text, fontSize: '0.875rem', fontWeight: 500, flexShrink: 0 }}>{field}</span>
              <span style={{ color: C.muted, fontSize: '0.82rem', textAlign: 'right' }}>{desc}</span>
            </div>
          ))}
        </div>

        {/* Contact */}
        <p style={{ color: C.muted, fontSize: '0.82rem', lineHeight: 1.7 }}>
          Questions? Contact us at{' '}
          <span style={{ color: C.gold }}>security@easyacco.com</span>
          {' '}— or{' '}
          <Link href="/dashboard" style={{ color: C.gold }}>return to the dashboard</Link>.
          {' '}Read our full{' '}
          <Link href="/privacy" style={{ color: C.gold }}>Privacy Policy</Link>.
        </p>
      </div>
    </div>
  )
}
