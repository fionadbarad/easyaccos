// Shared design tokens — mirrors the --sa-* CSS vars in globals.css.
// Use this instead of redefining per-file `const C = {...}` blocks.
export const C = {
  bg: 'var(--sa-black)',
  surface: 'var(--sa-surface)',
  card: 'var(--sa-surface)',
  gray: 'var(--sa-gray)',
  deep: 'var(--sa-gray)',
  white: 'var(--sa-white)',
  text: 'var(--sa-white)',
  muted: 'rgba(244,245,248,0.42)',
  dim: 'rgba(244,245,248,0.18)',
  border: 'var(--sa-border)',
  active: 'rgba(244,245,248,0.06)',
  hover: 'rgba(244,245,248,0.04)',
  green: '#4ADE80',
  good: '#4ADE80',
  red: '#F87171',
  warn: '#F87171',
  amber: '#FBBF24',
  blue: '#93C5FD',
} as const
