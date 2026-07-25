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
  muted: 'rgba(244,245,248,0.55)', // secondary copy — WCAG AA on #181818
  dim: 'rgba(244,245,248,0.35)', // eyebrows, decorative labels

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
