# EasyAcco

UK tax estimation and bookkeeping for the 2026/27 fiscal year.

Built by Fiona Barad. Live at [easyacco.uk](https://easyacco.uk).

## What it does

- Estimates UK income tax, NI, and student loan repayments for sole traders, employees, and limited-company directors
- Handles the Personal Allowance taper between £100k and £125,140 (the 60% trap)
- Supports Scottish bands and Plans 1, 2, 4, 5, and PG student loans
- Tracks invoices, expenses, and mileage with OCR receipt capture
- Generates SA103-ready CSV exports

## How it stores your data

Records are encrypted in the browser with AES-GCM (256-bit, Web Crypto API) before anything is synced. The device key never leaves your browser. Local-first via IndexedDB; works offline. Server-side is Supabase, but it only ever sees ciphertext.

## Stack

- Next.js 16 (App Router), React 19, strict TypeScript
- Tailwind CSS 4
- Supabase for auth and encrypted sync
- Tesseract.js for OCR
- Vitest for the tax engine tests

## Layout

- `src/lib/TaxBible2026.ts` - tax constants and scenario logic
- `src/lib/tax-logic.ts` - calculation engine
- `src/lib/storage/crypto.ts` - encryption layer
- `src/features/` - feature modules (invoices, expenses, tax estimator)
- `src/lib/__tests__/` - tests against HMRC worked examples

## Local dev

```
npm install
npm run dev
npm test
```

---

© 2026 Fiona Barad
