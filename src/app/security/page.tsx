import { Shield, Zap, Lock, Eye, Server, Globe } from 'lucide-react'
import Link from 'next/link'

function Pillar({ icon: Icon, title, body }: { icon: React.ElementType; title: string; body: string }) {
  return (
    <div className="bg-[#1C1D20] border border-[rgba(244,245,248,0.07)] rounded-[10px] p-[1.5rem] flex flex-col gap-[0.65rem]">
      <div className="w-[40px] h-[40px] rounded-[8px] bg-[rgba(244,245,248,0.06)] border border-[rgba(244,245,248,0.1)] flex items-center justify-center">
        <Icon size={20} className="text-[#F4F5F8]" />
      </div>
      <h3 className="text-[#F4F5F8] text-[1rem] font-bold m-0">{title}</h3>
      <p className="text-[rgba(244,245,248,0.42)] text-[0.85rem] leading-[1.65] m-0">{body}</p>
    </div>
  )
}

export default function SecurityPage() {
  return (
    <div className="bg-[#181818] min-h-screen p-[clamp(2rem,5vw,4rem)_clamp(1.5rem,5vw,3rem)]">
      <div className="max-w-[820px] mx-auto">

        {/* Header */}
        <div className="flex items-center gap-[1rem] mb-[1rem]">
          <div className="w-[52px] h-[52px] rounded-[12px] bg-[rgba(244,245,248,0.06)] border border-[rgba(244,245,248,0.1)] flex items-center justify-center">
            <Shield size={26} className="text-[#F4F5F8]" />
          </div>
          <div>
            <h1 className="text-[#F4F5F8] text-[clamp(1.6rem,3.5vw,2.2rem)] font-bold m-0">
              Security &amp; Privacy
            </h1>
            <p className="text-[rgba(244,245,248,0.42)] text-[0.875rem] mt-[4px] mb-0">
              How EasyAcco handles your financial data
            </p>
          </div>
        </div>

        {/* Hero statement */}
        <div className="bg-[rgba(244,245,248,0.04)] border border-[rgba(244,245,248,0.1)] rounded-[10px] p-[1.5rem] mb-[2.5rem]">
          <p className="text-[#F4F5F8] text-[1rem] leading-[1.7] m-0">
            <strong className="text-[#F4F5F8]">EasyAcco processes all tax calculations at the edge</strong> — your financial numbers never touch our servers. All estimations run entirely in your browser. We only store data when you explicitly choose to save it, and only after you authenticate with Google.
          </p>
        </div>

        {/* Security pillars */}
        <div className="grid gap-[1rem] mb-[2.5rem]" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))' }}>
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

        {/* Local-first encryption */}
        <div className="bg-[#1C1D20] border border-[rgba(244,245,248,0.07)] rounded-[10px] p-[1.5rem] mb-[2rem]">
          <h2 className="text-[#F4F5F8] text-[1.1rem] font-bold mb-[0.75rem]">
            Your Device, Your Keys
          </h2>
          <p className="text-[rgba(244,245,248,0.42)] text-[0.85rem] leading-[1.7] m-[0_0_0.75rem]">
            Expenses, invoices, and mileage you enter are stored in your browser&apos;s IndexedDB,
            encrypted with an <strong className="text-[#F4F5F8]">AES-GCM 256</strong> device key
            generated on first use. The key is marked <strong className="text-[#F4F5F8]">non-extractable</strong> —
            it cannot be read or exported, not even by this app&apos;s own code. Xero, QuickBooks,
            FreeAgent, and Sage all require server round-trips; we don&apos;t.
          </p>
          <p className="text-[rgba(244,245,248,0.42)] text-[0.85rem] leading-[1.7] m-0">
            <strong className="text-[#F4F5F8]">The trade-off:</strong> clearing site data or switching
            browsers loses access to the key, and therefore the data. Use{' '}
            <Link href="/dashboard/settings#backup" className="text-[#F4F5F8]">Settings → Backup</Link>{' '}
            to export a passphrase-protected snapshot. The passphrase derives a separate key via
            PBKDF2 (310,000 iterations, SHA-256) — keep it somewhere safe; it cannot be recovered.
          </p>
        </div>

        {/* What we store */}
        <div className="bg-[#1C1D20] border border-[rgba(244,245,248,0.07)] rounded-[10px] p-[1.5rem] mb-[2rem]">
          <h2 className="text-[#F4F5F8] text-[1.1rem] font-bold mb-[1rem]">
            What We Store (Only After Sign-In)
          </h2>
          {[
            ['Email address', 'Required for account identification via Supabase Auth'],
            ['Saved transactions', 'Only if you use the Save feature — encrypted at rest'],
            ['Display name', 'Optional, editable in Settings at any time'],
          ].map(([field, desc]) => (
            <div key={field} className="flex justify-between p-[10px_0] border-b border-[rgba(244,245,248,0.06)] gap-[1rem]">
              <span className="text-[#F4F5F8] text-[0.875rem] font-medium shrink-0">{field}</span>
              <span className="text-[rgba(244,245,248,0.42)] text-[0.82rem] text-right">{desc}</span>
            </div>
          ))}
        </div>

        {/* AI disclosure */}
        <div className="bg-[#1C1D20] border border-[rgba(244,245,248,0.07)] rounded-[10px] p-[1.5rem] mb-[2rem]">
          <h2 className="text-[#F4F5F8] text-[1.1rem] font-bold mb-[0.75rem]">
            AI Features &amp; Third-Party Processing
          </h2>
          <p className="text-[rgba(244,245,248,0.42)] text-[0.85rem] leading-[1.7] m-0">
            The Tax Advisory chat and the optional <strong className="text-[#F4F5F8]">Suggest Category</strong> button on the Expenses
            page send the relevant text (your question, or the expense description and amount) to
            <strong className="text-[#F4F5F8]"> Google Gemini</strong> for a single response. Numeric totals, receipt images, and your
            full ledger are never transmitted. Receipt OCR runs <strong className="text-[#F4F5F8]">entirely in your browser</strong> via
            Tesseract — the photo never leaves your device. If you prefer not to use AI features, simply don&apos;t click the
            Suggest button or open the Advisory tab — the rest of the app runs fully client-side.
          </p>
        </div>

        {/* Contact */}
        <p className="text-[rgba(244,245,248,0.42)] text-[0.82rem] leading-[1.7]">
          Questions? Contact us at{' '}
          <a href="mailto:baradfiona14@gmail.com" className="text-[#F4F5F8] no-underline border-b border-[rgba(244,245,248,0.2)]">baradfiona14@gmail.com</a>
          {' '}— or{' '}
          <Link href="/dashboard" className="text-[#F4F5F8]">return to the dashboard</Link>.
        </p>
      </div>
    </div>
  )
}
