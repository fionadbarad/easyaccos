// Style tokens + formatters shared across the tax calculator feature.
// Kept framework-free so logic modules can import without pulling in React.

import { fmtGBP } from '@/lib/TaxBible2026'

export const fmt = fmtGBP
export const pct = (n: number): string => n.toFixed(1) + '%'
