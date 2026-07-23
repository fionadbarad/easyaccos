// Shared design tokens — mirrors the --sa-* CSS vars in globals.css.
// Use this instead of redefining per-file `const C = {...}` blocks.
export const C = {
  bg: '#181818',
  surface: '#1C1D20',
  card: '#1C1D20',
  gray: '#222326',
  deep: '#222326',
  white: '#F4F5F8',
  text: '#F4F5F8',
  muted: 'rgba(244,245,248,0.42)',
  dim: 'rgba(244,245,248,0.18)',
  border: 'rgba(244,245,248,0.07)',
  active: 'rgba(244,245,248,0.06)',
  hover: 'rgba(244,245,248,0.04)',
  green: '#4ADE80',
  good: '#4ADE80',
  red: '#F87171',
  warn: '#F87171',
  amber: '#FBBF24',
  blue: '#93C5FD',
} as const
