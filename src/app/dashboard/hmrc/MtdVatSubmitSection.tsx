'use client'

import React, { useState } from 'react'
import {
  Section,
  SectionHeader,
  Field,
  Input,
  Button,
  Checkbox,
  ResultPane,
  FraudHeaderList,
} from './HmrcComponents'
import {
  HMRC_VAT_DEFAULT_PERIOD_KEY,
  HMRC_VAT_DEFAULT_DUE_SALES,
  HMRC_VAT_DEFAULT_RECLAIMED,
  HMRC_VAT_DEFAULT_TOTAL_SALES,
  HMRC_VAT_DEFAULT_TOTAL_PURCHASES,
} from '@/lib/hmrc/constants'
import { collectBrowserFraudData } from './browser-fraud-data'
import { deriveVatBoxes } from '@/lib/hmrc/vat-boxes'
import type { VatReturnBody } from '@/lib/hmrc/vat-return'

/** Form fields are strings; HMRC wants numbers. Blank reads as 0.00, not NaN. */
function num(v: string): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

export function MtdVatSubmitSection() {
  const [vrn, setVrn] = useState('')
  const [periodKey, setPeriodKey] = useState(HMRC_VAT_DEFAULT_PERIOD_KEY)
  // Box 1, 2 and 4 — the VAT boxes the user fills in. Boxes 3 and 5 are derived
  // from these below and never held in state, so there is no second copy of the
  // arithmetic to fall out of step with the server's.
  const [vatDueSales, setVatDueSales] = useState(HMRC_VAT_DEFAULT_DUE_SALES)
  const [vatDueAcquisitions, setVatDueAcquisitions] = useState('0.00')
  const [vatReclaimedCurrPeriod, setVatReclaimedCurrPeriod] = useState(HMRC_VAT_DEFAULT_RECLAIMED)
  // Boxes 6–9 — the ex-VAT totals, independent of the VAT arithmetic.
  const [totalValueSalesExVAT, setTotalValueSalesExVAT] = useState(HMRC_VAT_DEFAULT_TOTAL_SALES)
  const [totalValuePurchasesExVAT, setTotalValuePurchasesExVAT] = useState(
    HMRC_VAT_DEFAULT_TOTAL_PURCHASES,
  )
  const [totalValueGoodsSuppliedExVAT, setTotalValueGoodsSuppliedExVAT] = useState('0')
  const [totalAcquisitionsExVAT, setTotalAcquisitionsExVAT] = useState('0')
  const [finalised, setFinalised] = useState(false)
  const [govScenario, setGovScenario] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<Record<string, unknown> | null>(null)
  const [sentFraudHeaders, setSentFraudHeaders] = useState<Record<string, string> | null>(null)

  // Derived on every render from the three boxes they depend on — the same
  // function the test feeds through arithmeticErrors, so what is displayed here
  // is exactly what the server will re-derive and check.
  const derived = deriveVatBoxes({
    vatDueSales: num(vatDueSales),
    vatDueAcquisitions: num(vatDueAcquisitions),
    vatReclaimedCurrPeriod: num(vatReclaimedCurrPeriod),
  })

  // Which way the money moves. Box 5 is an absolute value, so without this the
  // screen shows the same figure for a £180 bill and a £180 refund.
  const isRepayment = derived.totalVatDue < num(vatReclaimedCurrPeriod)

  async function submit() {
    setLoading(true)
    setResult(null)
    setSentFraudHeaders(null)
    try {
      const browser = collectBrowserFraudData()
      const body: VatReturnBody = {
        vrn: vrn.trim(),
        periodKey: periodKey.trim(),
        vatDueSales: num(vatDueSales),
        vatDueAcquisitions: num(vatDueAcquisitions),
        totalVatDue: derived.totalVatDue,
        vatReclaimedCurrPeriod: num(vatReclaimedCurrPeriod),
        netVatDue: derived.netVatDue,
        totalValueSalesExVAT: num(totalValueSalesExVAT),
        totalValuePurchasesExVAT: num(totalValuePurchasesExVAT),
        totalValueGoodsSuppliedExVAT: num(totalValueGoodsSuppliedExVAT),
        totalAcquisitionsExVAT: num(totalAcquisitionsExVAT),
        finalised,
        browser,
        ...(govScenario ? { govTestScenario: govScenario } : {}),
      }
      const res = await fetch('/api/hmrc/mtd/vat/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        cache: 'no-store',
      })
      const json = (await res.json()) as { fraudHeaders?: Record<string, string> }
      setResult(json)
      if (json.fraudHeaders) setSentFraudHeaders(json.fraudHeaders)
    } catch (err) {
      setResult({
        ok: false,
        stage: 'submit',
        message: err instanceof Error ? err.message : 'Network error',
      })
    } finally {
      setLoading(false)
    }
  }

  const ok = typeof result === 'object' && result !== null && result.ok === true
  const status =
    typeof result === 'object' && result !== null ? (result.hmrcStatus ?? result.status) : undefined

  return (
    <Section>
      <SectionHeader
        kicker="phase 3b · mtd-vat submission"
        title="POST VAT return for period"
        sub="Files the nine-box VAT return for a sandbox test business. Boxes 3 and 5 are derived from the boxes you fill in and are re-checked by the server before anything reaches HMRC. The request carries the same fraud prevention headers as the Income Tax submission."
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1rem' }}>
        <Field label="vrn" hint="9 digits, e.g. 123456789">
          <Input value={vrn} onChange={setVrn} placeholder="123456789" />
        </Field>
        <Field label="period key" hint="4 characters from the obligation, e.g. A001 or 18A#">
          <Input value={periodKey} onChange={setPeriodKey} placeholder="A001" />
        </Field>

        <Field label="box 1 — vat due on sales (£)" hint="vatDueSales">
          <Input value={vatDueSales} onChange={setVatDueSales} type="number" />
        </Field>
        <Field label="box 2 — vat due on acquisitions (£)" hint="vatDueAcquisitions">
          <Input value={vatDueAcquisitions} onChange={setVatDueAcquisitions} type="number" />
        </Field>

        <Field label="box 3 — total vat due (£)" hint="derived: box 1 + box 2">
          <Input value={derived.totalVatDue.toFixed(2)} onChange={() => {}} readOnly />
        </Field>
        <Field label="box 4 — vat reclaimed on purchases (£)" hint="vatReclaimedCurrPeriod">
          <Input
            value={vatReclaimedCurrPeriod}
            onChange={setVatReclaimedCurrPeriod}
            type="number"
          />
        </Field>

        <Field
          label="box 5 — net vat (£)"
          hint={
            isRepayment
              ? 'derived: |box 3 − box 4| — HMRC owes you this'
              : 'derived: |box 3 − box 4| — you owe HMRC this'
          }
        >
          <Input value={derived.netVatDue.toFixed(2)} onChange={() => {}} readOnly />
        </Field>
        <Field label="box 6 — total sales ex-VAT (£)" hint="totalValueSalesExVAT">
          <Input value={totalValueSalesExVAT} onChange={setTotalValueSalesExVAT} type="number" />
        </Field>

        <Field label="box 7 — total purchases ex-VAT (£)" hint="totalValuePurchasesExVAT">
          <Input
            value={totalValuePurchasesExVAT}
            onChange={setTotalValuePurchasesExVAT}
            type="number"
          />
        </Field>
        <Field label="box 8 — goods supplied ex-VAT (£)" hint="totalValueGoodsSuppliedExVAT">
          <Input
            value={totalValueGoodsSuppliedExVAT}
            onChange={setTotalValueGoodsSuppliedExVAT}
            type="number"
          />
        </Field>

        <Field label="box 9 — acquisitions ex-VAT (£)" hint="totalAcquisitionsExVAT">
          <Input
            value={totalAcquisitionsExVAT}
            onChange={setTotalAcquisitionsExVAT}
            type="number"
          />
        </Field>
        <Field
          label="gov-test-scenario (optional)"
          hint="e.g. STATEFUL, DUPLICATE_SUBMISSION, INVALID_VRN"
        >
          <Input value={govScenario} onChange={setGovScenario} placeholder="(blank = DEFAULT)" />
        </Field>
      </div>

      {/* Unticked by default and never pre-filled: `finalised` is the user's
          legal declaration, not a form default, and the server refuses the
          submission without it. */}
      <Checkbox checked={finalised} onChange={setFinalised}>
        When you submit this VAT information you are making a legal declaration that the information
        is true and complete. A false declaration can result in prosecution.
      </Checkbox>

      <div style={{ marginTop: '0.5rem' }}>
        <Button onClick={submit} disabled={loading || !vrn || !periodKey || !finalised}>
          {loading ? 'Submitting to HMRC…' : 'Submit VAT return to HMRC'}
        </Button>
      </div>

      {result !== null && (
        <ResultPane
          ok={ok}
          label={ok ? `[OK]  HMRC accepted → ${status}` : `[FAIL]  HMRC → ${status ?? '???'}`}
          body={result}
        />
      )}
      {sentFraudHeaders && <FraudHeaderList headers={sentFraudHeaders} />}
    </Section>
  )
}
