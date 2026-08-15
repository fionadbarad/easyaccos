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
    <main className="min-h-screen bg-sa-black text-sa-white px-5 py-10">
      <div className="max-w-[960px] mx-auto">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h1 className="text-display font-bold">Demo Dashboard (No login)</h1>
          <Link
            href="/auth/signup"
            className="bg-sa-white text-sa-black px-[14px] py-2 rounded-[5px] font-bold"
          >
            Save and Sign In
          </Link>
        </div>
        <p className="text-sa-muted mb-6">
          Explore EasyAcco with sample freelancer data. All data is mocked, no account required.
        </p>

        <section className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(190px,1fr))] mb-5">
          {[
            { label: 'Annual Income', value: `£${mock.income.toLocaleString()}` },
            { label: 'Expenses', value: `£${mock.expenses.toLocaleString()}` },
            { label: 'Tax due', value: `£${mock.tax.toLocaleString()}` },
            { label: 'Take-home', value: `£${mock.net.toLocaleString()}` },
          ].map((item) => (
            <div key={item.label} className="bg-sa-surface rounded-lg border border-sa-border p-4">
              <p className="text-sa-muted text-meta mb-2">{item.label}</p>
              <p className="text-title font-bold">{item.value}</p>
            </div>
          ))}
        </section>

        <section className="bg-sa-surface border border-sa-border rounded-lg p-[1.2rem]">
          <h2 className="text-title mb-3">How this demo works</h2>
          <ul className="text-sa-muted leading-[1.6] pl-[1.2rem]">
            <li>Instant calculations from your income and expenses</li>
            <li>HMRC-style tax bands (20/40/45%) with personal allowance</li>
            <li>Realistic growth scenario for freelancers in 2026 UK tax year</li>
            <li>No auth, no data saved — but you can sign up anytime</li>
          </ul>
        </section>

        {/* This navy pair (#111827 / rgba(98,113,148,0.25)) is not in the
            palette at all — it is the only place in the app using it. Carried
            across verbatim; picking a palette equivalent would change the
            panel's colour, which is a design call rather than a mapping. */}
        <div className="mt-6 p-4 bg-[#111827] border border-[rgba(98,113,148,0.25)] rounded-lg">
          <p className="text-sa-muted mb-[0.35rem]">Trust signals:</p>
          <p className="text-lead text-sa-white">
            Secure &amp; encrypted · Built for UK freelancers · Your data stays private
          </p>
        </div>
      </div>
    </main>
  )
}
