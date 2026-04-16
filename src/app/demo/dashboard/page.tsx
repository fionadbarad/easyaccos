import Link from 'next/link'

const C = { bg: '#181818', card: '#1C1D20', white: '#F4F5F8', text: '#F4F5F8', muted: 'rgba(244,245,248,0.42)' }

const mock = {
  income: 42000,
  expenses: 8600,
  profit: 33400,
  tax: 5300,
  net: 28100,
}

export default function DemoDashboardPage() {
  return (
    <main style={{ minHeight: '100vh', background: C.bg, color: C.text, padding: '2.5rem 1.25rem' }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
          <h1 style={{ fontSize: '1.7rem', fontWeight: 700 }}>Demo Dashboard (No login)</h1>
          <Link href="/auth/signup" style={{ background: C.white, color: '#181818', padding: '8px 14px', borderRadius: '5px', fontWeight: 700 }}>
            Save and Sign In
          </Link>
        </div>
        <p style={{ color: C.muted, marginBottom: '1.5rem' }}>
          Explore EasyAcco with sample freelancer data. All data is mocked, no account required.
        </p>

        <section style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', marginBottom: '1.25rem' }}>
          {[
            { label: 'Annual Income', value: `£${mock.income.toLocaleString()}` },
            { label: 'Expenses', value: `£${mock.expenses.toLocaleString()}` },
            { label: 'Tax due', value: `£${mock.tax.toLocaleString()}` },
            { label: 'Take-home', value: `£${mock.net.toLocaleString()}` },
          ].map((item) => (
            <div key={item.label} style={{ background: C.card, borderRadius: '8px', border: `1px solid rgba(244,245,248,0.07)`, padding: '1rem' }}>
              <p style={{ color: C.muted, fontSize: '0.8rem', marginBottom: '0.5rem' }}>{item.label}</p>
              <p style={{ fontSize: '1.25rem', fontWeight: 700 }}>{item.value}</p>
            </div>
          ))}
        </section>

        <section style={{ background: C.card, border: `1px solid rgba(244,245,248,0.07)`, borderRadius: '8px', padding: '1.2rem' }}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: '.75rem' }}>How this demo works</h2>
          <ul style={{ color: C.muted, lineHeight: 1.6, paddingLeft: '1.2rem' }}>
            <li>Instant calculations from your income and expenses</li>
            <li>HMRC-style tax bands (20/40/45%) with personal allowance</li>
            <li>Realistic growth scenario for freelancers in 2026 UK tax year</li>
            <li>No auth, no data saved — but you can sign up anytime</li>
          </ul>
        </section>

        <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#111827', border: '1px solid rgba(98,113,148,0.25)', borderRadius: '8px' }}>
          <p style={{ color: C.muted, marginBottom: '0.35rem' }}>Trust signals:</p>
          <p style={{ fontSize: '0.95rem', color: C.text }}>Secure & encrypted · Built for UK freelancers · Your data stays private</p>
        </div>
      </div>
    </main>
  )
}
