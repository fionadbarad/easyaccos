// Shared type scale — mirrors the --text-* tokens defined in @theme in
// globals.css. Import this in components that style with inline `style={{}}`
// objects; use the `text-*` Tailwind utilities everywhere else. Both resolve
// to the same CSS variables, so the two styling approaches stay in step.
//
//   T.micro    11px   uppercase mono eyebrows, tiny badges
//   T.caption  12px   captions, footnotes, table meta
//   T.meta     13px   secondary copy, helper text
//   T.body     14px   default UI text, buttons, inputs
//   T.lead     16px   intro paragraphs, card headings
//   T.title    18px   section titles
//   T.heading  22px   page headings, stat figures
//   T.display  28px   hero figures
//   T.h1/h2/h3        fluid marketing headings
export const T = {
  micro: 'var(--text-micro)',
  caption: 'var(--text-caption)',
  meta: 'var(--text-meta)',
  body: 'var(--text-body)',
  lead: 'var(--text-lead)',
  title: 'var(--text-title)',
  heading: 'var(--text-heading)',
  display: 'var(--text-display)',
  h3: 'var(--text-h3)',
  h2: 'var(--text-h2)',
  h1: 'var(--text-h1)',
} as const

export type TypeToken = keyof typeof T

// Icon sizes (lucide-react `size` prop), in px. Keeping icons on a scale stops
// the 9/10/11/12/13/14/15/16/17px drift that made rows of icons look ragged.
export const ICON = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 20,
  xl: 24,
} as const
