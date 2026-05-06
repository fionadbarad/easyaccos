import Link from 'next/link'

const mock = {
  income: 42000,
  expenses: 8600,
  profit: 33400,
  tax: 5300,
  net: 28100,
}

export default function DemoDashboardPage() {
  return (
    <main className="min-h-screen bg-[var(--sa-black)] text-[var(--sa-white)] p-[2.5rem_1.25rem]">
      <div className="max-w-[960px] mx-auto">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h1 className="text-[1.7rem] font-bold">Demo Dashboard (No login)</h1>
          <Link href="/auth/signup" className="bg-[var(--sa-white)] text-[var(--sa-black)] px-[14px] py-[8px] rounded-[5px] font-bold no-underline">
            Save and Sign In
          </Link>
        </div>
        <p className="text-[rgba(244,245,248,0.42)] mb-6">
          Explore EasyAcco with sample freelancer data. All data is mocked, no account required.
        </p>

        <section className="grid gap-4 mb-5" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))' }}>
          {[
            { label: 'Annual Income', value: `£${mock.income.toLocaleString()}` },
            { label: 'Expenses', value: `£${mock.expenses.toLocaleString()}` },
            { label: 'Tax due', value: `£${mock.tax.toLocaleString()}` },
            { label: 'Take-home', value: `£${mock.net.toLocaleString()}` },
          ].map((item) => (
            <div key={item.label} className="bg-[var(--sa-surface)] rounded-lg border border-[var(--sa-border)] p-4">
              <p className="text-[rgba(244,245,248,0.42)] text-[0.8rem] mb-2">{item.label}</p>
              <p className="text-xl font-bold m-0">{item.value}</p>
            </div>
          ))}
        </section>

        <section className="bg-[var(--sa-surface)] border border-[var(--sa-border)] rounded-lg p-[1.2rem]">
          <h2 className="text-[1.1rem] mb-3">How this demo works</h2>
          <ul className="text-[rgba(244,245,248,0.42)] leading-[1.6] pl-[1.2rem] m-0">
            <li>Instant calculations from your income and expenses</li>
            <li>HMRC-style tax bands (20/40/45%) with personal allowance</li>
            <li>Realistic growth scenario for freelancers in 2026 UK tax year</li>
            <li>No auth, no data saved - but you can sign up anytime</li>
          </ul>
        </section>

        <div className="mt-6 p-4 bg-[#111827] border border-[rgba(98,113,148,0.25)] rounded-lg">
          <p className="text-[rgba(244,245,248,0.42)] mb-[0.35rem]">Trust signals:</p>
          <p className="text-[0.95rem] text-[var(--sa-white)] m-0">Secure & encrypted · Built for UK freelancers · Your data stays private</p>
        </div>
      </div>
    </main>
  )
}
