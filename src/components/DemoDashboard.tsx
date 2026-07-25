'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import TaxEstimator2026 from './TaxEstimator2026'
import { T } from '@/styles/type'

interface Expense {
  id: number
  category: string
  description: string
  amount: number
  date: string
  hmrcAllowable: boolean
}

const EXPENSES: Expense[] = [
  {
    id: 1,
    category: 'Software',
    description: 'Adobe Creative Suite',
    amount: 599,
    date: '2026-03-01',
    hmrcAllowable: true,
  },
  {
    id: 2,
    category: 'Travel',
    description: 'Client meeting — London',
    amount: 84,
    date: '2026-03-08',
    hmrcAllowable: true,
  },
  {
    id: 3,
    category: 'Equipment',
    description: 'Mechanical keyboard',
    amount: 129,
    date: '2026-03-12',
    hmrcAllowable: true,
  },
  {
    id: 4,
    category: 'Professional',
    description: 'Accountant consultation',
    amount: 200,
    date: '2026-03-15',
    hmrcAllowable: true,
  },
  {
    id: 5,
    category: 'Marketing',
    description: 'Instagram ads',
    amount: 75,
    date: '2026-03-20',
    hmrcAllowable: false,
  },
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
  { label: 'Total Income', value: gbp.format(ANNUAL_INCOME), color: 'var(--sa-green)' },
  { label: 'Expenses', value: gbp.format(TOTAL_EXPENSES), color: 'var(--sa-red)' },
  {
    label: 'Net Profit',
    value: gbp.format(ANNUAL_INCOME - TOTAL_EXPENSES),
    color: 'var(--sa-white)',
  },
  { label: 'Est. Tax', value: gbp.format(ESTIMATED_TAX), color: 'var(--sa-muted)' },
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
      style={{ minHeight: '100vh', background: 'var(--sa-black)', paddingBottom: '4rem' }}
    >
      {/* Demo banner */}
      <div
        style={{
          background: 'rgba(244,245,248,0.03)',
          borderBottom: '1px solid var(--sa-border)',
          padding: '10px 24px',
          textAlign: 'center',
          fontSize: T.meta,
          color: 'var(--sa-muted)',
        }}
      >
        Demo mode — no login required.{' '}
        <button
          onClick={() => openModal('sign up')}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--sa-white)',
            cursor: 'pointer',
            textDecoration: 'underline',
            fontSize: 'inherit',
          }}
        >
          Create a free account to save →
        </button>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '2rem 1.5rem' }}>
        <h1
          style={{
            fontSize: T.heading,
            fontWeight: 700,
            marginBottom: '0.25rem',
            color: 'var(--sa-white)',
          }}
        >
          Overview
        </h1>
        <p style={{ color: 'var(--sa-muted)', fontSize: T.body, marginBottom: '2rem' }}>
          Demo data — Tax Year 6 April 2026 – 5 April 2027
        </p>

        {/* Stats */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))',
            gap: '1rem',
            marginBottom: '1.75rem',
          }}
        >
          {STATS.map((stat, i) => (
            <motion.div
              key={stat.label}
              className="ui-card"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
            >
              <div
                style={{
                  color: 'var(--sa-muted)',
                  fontSize: T.caption,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  marginBottom: '0.5rem',
                }}
              >
                {stat.label}
              </div>
              <div style={{ fontSize: T.heading, fontWeight: 700, color: stat.color }}>
                {stat.value}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '2.25rem', flexWrap: 'wrap' }}>
          <button className="ui-btn-primary" onClick={() => openModal('save your data')}>
            Save Data
          </button>
          <button className="ui-btn-secondary" onClick={() => openModal('connect your bank')}>
            Connect Bank
          </button>
        </div>

        {/* Tax estimator */}
        <div style={{ marginBottom: '2.25rem' }}>
          <TaxEstimator2026 />
        </div>

        {/* Expenses */}
        <div className="ui-card">
          <h2 className="ui-card-title" style={{ fontSize: T.lead, marginBottom: '1rem' }}>
            Recent Expenses
          </h2>
          {EXPENSES.map((expense, i) => (
            <motion.div
              key={expense.id}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.75rem 0',
                borderBottom: i < EXPENSES.length - 1 ? '1px solid var(--sa-border)' : 'none',
              }}
            >
              <div>
                <div style={{ fontSize: T.body, color: 'var(--sa-white)', marginBottom: '2px' }}>
                  {expense.description}
                </div>
                <div style={{ fontSize: T.caption, color: 'var(--sa-muted)' }}>
                  {expense.category} · {expense.date}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 600, color: 'var(--sa-white)', marginBottom: '2px' }}>
                  {gbp.format(expense.amount)}
                </div>
                {expense.hmrcAllowable && (
                  <span
                    style={{
                      fontSize: T.micro,
                      background: 'rgba(74,222,128,0.1)',
                      border: '1px solid rgba(74,222,128,0.25)',
                      color: 'var(--sa-green)',
                      padding: '2px 6px',
                      borderRadius: '3px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
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
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.75)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              padding: '1.5rem',
            }}
          >
            <motion.div
              initial={{ scale: 0.93, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.93, y: 16 }}
              transition={{ type: 'spring', stiffness: 320, damping: 30 }}
              className="ui-card"
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: 420, width: '100%', textAlign: 'center', padding: '2.25rem' }}
            >
              <h2
                style={{
                  fontSize: T.title,
                  fontWeight: 600,
                  marginBottom: '0.75rem',
                  color: 'var(--sa-white)',
                }}
              >
                Want to {promptAction}?
              </h2>
              <p
                style={{
                  color: 'var(--sa-muted)',
                  fontSize: T.body,
                  lineHeight: 1.7,
                  marginBottom: '1.75rem',
                }}
              >
                Sign in to create your free EasyAcco account and save your numbers, track expenses,
                and get your personalised 2026/27 tax estimate.
              </p>
              <div
                style={{
                  display: 'flex',
                  gap: '0.75rem',
                  justifyContent: 'center',
                  flexWrap: 'wrap',
                  marginBottom: '1rem',
                }}
              >
                <Link href="/auth/signup" style={{ textDecoration: 'none' }}>
                  <button className="ui-btn-primary">Create Free Account</button>
                </Link>
                <Link href="/auth/login" style={{ textDecoration: 'none' }}>
                  <button className="ui-btn-secondary">Sign In</button>
                </Link>
              </div>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--sa-muted)',
                  cursor: 'pointer',
                  fontSize: T.meta,
                }}
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
