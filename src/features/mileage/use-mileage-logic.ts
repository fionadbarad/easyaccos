'use client'

/**
 * State wiring for the mileage page: storage, form fields, and the memoised
 * derivations over them.
 *
 * The arithmetic itself lives in `mileage-model.ts`, which imports no React and
 * is tested directly. This hook only decides WHEN to recompute and holds the
 * three things that are genuinely stateful — the entries, the form, and which
 * panels are open.
 */

import { useCallback, useMemo, useState } from 'react'
import { useUserData } from '@/lib/use-user-data'
import { todayISO } from '@/lib/dates'
import { newId } from '@/lib/id'
import { taxYearOf, taxYearLabel, type VehicleType } from '@/lib/tax/mileage'
import {
  carMilesBeforeFor,
  isJourneyValid,
  summariseMileage,
  type MileageEntry,
  type MileageSummary,
} from './mileage-model'

const SEED: MileageEntry[] = []

export interface MileageForm {
  date: string
  description: string
  vehicle: VehicleType
  miles: string
}

export interface MileageLogic {
  loading: boolean
  isAuthenticated: boolean
  /** e.g. "2026/27" — the tax year the headline figures report on. */
  yearLabel: string
  summary: MileageSummary
  /** Car miles the previewed journey would be priced after. */
  previewMilesBefore: number
  form: MileageForm
  setField: <K extends keyof MileageForm>(key: K, value: MileageForm[K]) => void
  canSubmit: boolean
  showForm: boolean
  setShowForm: (open: boolean) => void
  ratesOpen: boolean
  setRatesOpen: (open: boolean) => void
  addEntry: () => void
  deleteEntry: (id: string) => void
}

function blankForm(): MileageForm {
  return { date: todayISO(), description: '', vehicle: 'car', miles: '' }
}

export function useMileageLogic(): MileageLogic {
  const {
    items: entries,
    persist,
    loading,
    isAuthenticated,
  } = useUserData<MileageEntry>('user_mileage', 'easyacco_mileage', SEED)

  const [showForm, setShowForm] = useState(false)
  const [ratesOpen, setRatesOpen] = useState(false)
  const [form, setForm] = useState<MileageForm>(blankForm)

  // The tax year the page reports on. Read once per mount so a session left
  // open across 6 April does not reshuffle totals mid-interaction.
  const reportedTaxYear = useMemo(() => taxYearOf(todayISO()), [])

  const summary = useMemo(
    () => summariseMileage(entries, reportedTaxYear),
    [entries, reportedTaxYear],
  )

  const previewMilesBefore = useMemo(
    () => carMilesBeforeFor(entries, form.vehicle, form.date),
    [entries, form.vehicle, form.date],
  )

  const setField = useCallback(
    <K extends keyof MileageForm>(key: K, value: MileageForm[K]) =>
      setForm((f) => ({ ...f, [key]: value })),
    [],
  )

  const canSubmit = isJourneyValid(form.description, form.miles)

  const addEntry = useCallback(() => {
    if (!isJourneyValid(form.description, form.miles)) return
    const entry: MileageEntry = {
      id: newId(),
      date: form.date,
      description: form.description.trim(),
      vehicle: form.vehicle,
      miles: parseFloat(form.miles),
      createdAt: new Date().toISOString(),
    }
    void persist([entry, ...entries])
    setForm(blankForm())
    setShowForm(false)
  }, [form, entries, persist])

  const deleteEntry = useCallback(
    (id: string) => void persist(entries.filter((e) => e.id !== id)),
    [entries, persist],
  )

  return {
    loading,
    isAuthenticated,
    yearLabel: taxYearLabel(reportedTaxYear),
    summary,
    previewMilesBefore,
    form,
    setField,
    canSubmit,
    showForm,
    setShowForm,
    ratesOpen,
    setRatesOpen,
    addEntry,
    deleteEntry,
  }
}
