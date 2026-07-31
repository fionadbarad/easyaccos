// Shared colour tokens — the JS mirror of the --color-sa-* values declared in
// the @theme block in globals.css. Use this for components that style with
// inline `style={{}}` objects; use the `sa-*` Tailwind utilities everywhere
// else. Keep the two in sync — these are literal values rather than var()
// references so they also work in SVG and chart props.
export const C = {
  // Surfaces
  bg: '#181818',
  surface: '#1C1D20',
  gray: '#222326',

  // Foreground
  white: '#F4F5F8',
  // Measured against both surfaces (#181818 page, #1C1D20 card):
  //   white 1.00 → 16.29:1 / 15.46:1
  //   muted 0.55 →  5.70:1 /  5.56:1   AA body text ✓
  //   dim   0.48 →  4.63:1 /  4.57:1   AA body text ✓
  // dim was 0.35, which measures 3.05:1 — enough only for LARGE text, and it
  // is used for small captions, footers and eyebrow labels throughout. That is
  // a WCAG 2.2 AA 1.4.3 failure on body-size copy, so the floor is raised to
  // the lowest alpha that clears 4.5:1 on both surfaces. Do not lower it.
  muted: 'rgba(244,245,248,0.55)',
  dim: 'rgba(244,245,248,0.48)',

  // Lines
  border: 'rgba(244,245,248,0.07)',
  line: 'rgba(244,245,248,0.18)',
  focus: 'rgba(244,245,248,0.3)',

  // Fills
  tint: 'rgba(244,245,248,0.03)',
  hover: 'rgba(244,245,248,0.05)',
  selected: 'rgba(244,245,248,0.08)',

  // Status
  green: '#4ADE80',
  red: '#F87171',
  amber: '#FBBF24',
  blue: '#93C5FD',

  // Legacy aliases — kept so existing call sites keep compiling.
  card: '#1C1D20',
  deep: '#222326',
  text: '#F4F5F8',
  active: 'rgba(244,245,248,0.05)',
  good: '#4ADE80',
  warn: '#F87171',
} as const
