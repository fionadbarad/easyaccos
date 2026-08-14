'use client'

import { useState, useMemo, useEffect } from 'react'
import { useUserData } from '@/lib/use-user-data'
import { todayISO } from '@/lib/dates'
import type { ReceiptExtract } from '@/components/ReceiptScanner'
import {
  emptyFilter,
  matchesRange,
  matchesCategories,
  matchesQuery,
} from '@/components/tracker/filter'
import type { FilterState } from '@/components/tracker/filter'
import { isValidExpense, partitionValid, type Expense } from '@/lib/validators'
import { reportWarn } from '@/lib/monitor'
import { newId } from '@/lib/id'

export const CATEGORIES = [
  'Office & Equipment',
  'Travel & Transport',
  'Software & Subscriptions',
  'Marketing & Advertising',
  'Professional Services',
  'Training & Education',
  'Utilities',
  'Meals (business)',
  'Other',
]

export interface PendingScan {
  extract: ReceiptExtract
  form: { date: string; description: string; category: string; amount: string }
}

export interface ExpenseFormState {
  date: string
  description: string
  category: string
  amount: string
}

const SEED: Expense[] = []

function toISODate(d: Date) {
  return todayISO(d)
}

export function useExpenses() {
  const {
    items: storedExpenses,
    persist,
    loading,
    isAuthenticated,
  } = useUserData<Expense>('user_expenses', 'easyacco_expenses', SEED)

  // The trust boundary. `storedExpenses` is whatever the Supabase select or the
  // decrypted local snapshot returned — typed as Expense[] because useUserData
  // was told so, not because anything checked. A row with a null amount reaches
  // `total` and turns the whole figure into NaN; one with a missing category
  // silently drops out of byCategory while still counting in the total. Dropping
  // it here keeps the page arithmetic sound.
  const { valid: expenses, invalid } = useMemo(
    () => partitionValid(storedExpenses, isValidExpense),
    [storedExpenses],
  )

  // Reported from an effect, not from the memo above: a render must stay free
  // of side effects, or StrictMode's double invoke reports every bad row twice.
  useEffect(() => {
    for (const row of invalid) {
      reportWarn('useExpenses.invalidRow', 'dropped an expense row that failed validation', {
        id:
          row && typeof row === 'object' && typeof (row as { id?: unknown }).id === 'string'
            ? (row as { id: string }).id
            : undefined,
        keys: row && typeof row === 'object' ? Object.keys(row) : typeof row,
      })
    }
  }, [invalid])

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<ExpenseFormState>({
    date: toISODate(new Date()),
    description: '',
    category: CATEGORIES[0]!,
    amount: '',
  })
  const [filter, setFilter] = useState<FilterState>(emptyFilter())
  const [pendingScan, setPendingScan] = useState<PendingScan | null>(null)

  useEffect(() => {
    if (!pendingScan) return
    return () => {
      URL.revokeObjectURL(pendingScan.extract.imageUrl)
    }
  }, [pendingScan])

  const filtered = useMemo(
    () =>
      expenses.filter(
        (e) =>
          matchesRange(e.date, filter.range) &&
          matchesCategories(e.category, filter.categories) &&
          matchesQuery(`${e.description} ${e.category}`, filter.query),
      ),
    [expenses, filter],
  )

  const total = filtered.reduce((s, e) => s + e.amount, 0)

  const byCategory = CATEGORIES.map((cat) => ({
    cat,
    total: filtered.filter((e) => e.category === cat).reduce((s, e) => s + e.amount, 0),
  }))
    .filter((c) => c.total > 0)
    .sort((a, b) => b.total - a.total)

  function onReceiptExtract(data: ReceiptExtract) {
    setPendingScan({
      extract: data,
      form: {
        date: data.date || toISODate(new Date()),
        description: data.description || '',
        category: CATEGORIES[0]!,
        amount: data.amount != null ? data.amount.toFixed(2) : '',
      },
    })
  }

  async function confirmScan(confirmedForm: PendingScan['form']) {
    const amount = parseFloat(confirmedForm.amount)
    if (!amount || !confirmedForm.description.trim()) return
    await persist([{ id: newId(), ...confirmedForm, amount, ocrScanned: true }, ...expenses])
    if (pendingScan) URL.revokeObjectURL(pendingScan.extract.imageUrl)
    setPendingScan(null)
  }

  function cancelScan() {
    if (pendingScan) URL.revokeObjectURL(pendingScan.extract.imageUrl)
    setPendingScan(null)
  }

  async function addExpense(e: React.FormEvent) {
    e.preventDefault()
    const amount = parseFloat(form.amount)
    if (!amount || !form.description.trim()) return
    await persist([{ id: newId(), ...form, amount }, ...expenses])
    setForm((f) => ({ ...f, description: '', amount: '' }))
    setShowForm(false)
  }

  async function remove(id: string) {
    await persist(expenses.filter((e) => e.id !== id))
  }

  return {
    expenses,
    filtered,
    loading,
    isAuthenticated,
    showForm,
    setShowForm,
    form,
    setForm,
    filter,
    setFilter,
    pendingScan,
    total,
    byCategory,
    addExpense,
    remove,
    onReceiptExtract,
    confirmScan,
    cancelScan,
  }
}
