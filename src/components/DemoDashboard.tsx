'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import TaxEstimator2026 from './TaxEstimator2026'

interface Expense {
  id: number
  category: string
  description: string
  amount: number
  date: string
  hmrcAllowable: boolean
}

const EXPENSES: Expense[] = [
  { id: 1, category: 'Software',     description: 'Adobe Creative Suite',   amount: 599, date: '2026-03-01', hmrcAllowable: true  },
  { id: 2, category: 'Travel',       description: 'Client meeting — London', amount: 84,  date: '2026-03-08', hmrcAllowable: true  },
  { id: 3, category: 'Equipment',    description: 'Mechanical keyboard',     amount: 129, date: '2026-03-12', hmrcAllowable: true  },
  { id: 4, category: 'Professional', description: 'Accountant consultation', amount: 200, date: '2026-03-15', hmrcAllowable: true  },
  { id: 5, category: 'Marketing',    description: 'Instagram ads',           amount: 75,  date: '2026-03-20', hmrcAllowable: false },
]

const ANNUAL_INCOME = 45_000
const TOTAL_EXPENSES = EXPENSES.reduce((sum, e) => sum + e.amount, 0)
const ESTIMATED_TAX = Math.round(ANNUAL_INCOME * 0.23)

const gbp = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  maximumFractionDigits: 0,
})

const STATS = [
  { label: 'Total Income', value: gbp.format(ANNUAL_INCOME),                  color: 'var(--sa-green)' },
  { label: 'Expenses',     value: gbp.format(TOTAL_EXPENSES),                 color: 'var(--sa-red)'   },
  { label: 'Net Profit',   value: gbp.format(ANNUAL_INCOME - TOTAL_EXPENSES), color: 'var(--sa-white)' },
  { label: 'Est. Tax',     value: gbp.format(ESTIMATED_TAX),                  color: 'var(--sa-muted)' },
]

export default function DemoDashboard() {
  const [showModal, setShowModal] = useState(false)
  const [promptAction, setPromptAction] = useState('')

  function openModal(action: string) {
    setPromptAction(action)
    setShowModal(true)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="min-h-screen bg-[var(--sa-black)] pb-[4rem]"
    >
      {/* Demo banner */}
      <div className="bg-[rgba(244,245,248,0.03)] border-b border-[var(--sa-border)] px-[24px] py-[10px] text-center text-[0.8rem] text-[var(--sa-muted)]">
        Demo mode — no login required.{' '}
        <button
          onClick={() => openModal('sign up')}
          className="bg-transparent border-none text-[var(--sa-white)] cursor-pointer underline text-[inherit]"
        >
          Create a free account to save →
        </button>
      </div>

      <div className="max-w-[1100px] mx-auto px-[1.5rem] py-[2rem]">
        <h1 className="text-2xl font-bold mb-1 text-[var(--sa-white)]">
          Overview
        </h1>
        <p className="text-[var(--sa-muted)] text-sm mb-8">
          Demo data — Tax Year 6 April 2026 – 5 April 2027
        </p>

        {/* Stats */}
        <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4 mb-7">
          {STATS.map((stat, i) => (
            <motion.div
              key={stat.label}
              className="ui-card"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
            >
              <div className="text-[var(--sa-muted)] text-[0.72rem] uppercase tracking-[0.08em] mb-2">
                {stat.label}
              </div>
              <div className="text-[1.4rem] font-bold" style={{ color: stat.color }}>
                {stat.value}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-3 mb-[2.25rem] flex-wrap">
          <button className="ui-btn-primary"    onClick={() => openModal('save your data')}>Save Data</button>
          <button className="ui-btn-secondary"  onClick={() => openModal('connect your bank')}>Connect Bank</button>
        </div>

        {/* Tax estimator */}
        <div className="mb-[2.25rem]">
          <TaxEstimator2026 />
        </div>

        {/* Expenses */}
        <div className="ui-card">
          <h2 className="ui-card-title text-[1.05rem] mb-4">Recent Expenses</h2>
          {EXPENSES.map((expense, i) => (
            <motion.div
              key={expense.id}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
              className={`flex justify-between items-center py-[0.75rem] ${i < EXPENSES.length - 1 ? 'border-b border-[var(--sa-border)]' : ''}`}
            >
              <div>
                <div className="text-sm text-[var(--sa-white)] mb-0.5">
                  {expense.description}
                </div>
                <div className="text-xs text-[var(--sa-muted)]">
                  {expense.category} · {expense.date}
                </div>
              </div>
              <div className="text-right">
                <div className="font-semibold text-[var(--sa-white)] mb-0.5">
                  {gbp.format(expense.amount)}
                </div>
                {expense.hmrcAllowable && (
                  <span className="text-[0.65rem] bg-[rgba(74,222,128,0.1)] border border-[rgba(74,222,128,0.25)] text-[var(--sa-green)] px-[6px] py-[2px] rounded-[3px] uppercase tracking-[0.05em]">
                    HMRC allowable
                  </span>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Sign-up prompt modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowModal(false)}
            className="fixed inset-0 bg-[rgba(0,0,0,0.75)] flex items-center justify-center z-[1000] p-6"
          >
            <motion.div
              initial={{ scale: 0.93, y: 16 }}
              animate={{ scale: 1,    y: 0  }}
              exit={{ scale: 0.93,    y: 16 }}
              transition={{ type: 'spring', stiffness: 320, damping: 30 }}
              className="ui-card max-w-[420px] w-full text-center p-[2.25rem]"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-xl font-semibold mb-3 text-[var(--sa-white)]">
                Want to {promptAction}?
              </h2>
              <p className="text-[var(--sa-muted)] text-sm leading-[1.7] mb-7">
                Sign in to create your free EasyAcco account and save your numbers, track expenses,
                and get your personalised 2026/27 tax estimate.
              </p>
              <div className="flex gap-3 justify-center flex-wrap mb-4">
                <Link href="/auth/signup" className="no-underline">
                  <button className="ui-btn-primary">Create Free Account</button>
                </Link>
                <Link href="/auth/login" className="no-underline">
                  <button className="ui-btn-secondary">Sign In</button>
                </Link>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="bg-transparent border-none text-[var(--sa-muted)] cursor-pointer text-[0.8rem]"
              >
                Continue in demo mode
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
