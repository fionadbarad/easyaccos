// Shared class names + formatters for the tax calculator feature.
//
// These were `React.CSSProperties` objects spread into `style={{}}` across six
// components. They are Tailwind class strings now, so the whole feature styles
// the same way as the rest of the app and emits no inline style attributes.
//
// Written as complete literal strings, never composed from fragments at
// runtime: Tailwind generates utilities by scanning source text, so a class
// assembled by concatenation is a class that never reaches the stylesheet.

import { fmtGBP, pct1 } from '@/lib/formatters'

export const fmt = fmtGBP
export const pct = pct1

export const LABEL_CLASS =
  'block text-sa-muted text-caption tracking-[0.08em] uppercase mb-[0.4rem]'

export const INPUT_CLASS =
  'w-full bg-sa-gray border border-sa-border rounded-[6px] px-[13px] py-[10px] text-sa-white text-body outline-none box-border min-h-[44px]'

/** `.ui-select-chevron` carries the caret data URI — see globals.css. */
export const SELECT_CLASS = `${INPUT_CLASS} ui-select-chevron`

export const CARD_CLASS = 'bg-sa-surface border border-sa-border rounded-[10px] p-6'

export function toggleClass(active: boolean): string {
  return `px-[14px] py-[6px] rounded-[6px] cursor-pointer text-caption font-semibold min-h-[36px] transition-all duration-150 border ${
    active
      ? 'bg-[rgba(244,245,248,0.1)] border-sa-white text-sa-white'
      : 'bg-transparent border-sa-border text-sa-muted'
  }`
}
