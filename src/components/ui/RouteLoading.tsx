import { C } from '@/styles/palette'
import { Skeleton, SkeletonRows } from './Skeleton'

/**
 * Route-level streaming fallback. Mirrors the shared dashboard page chrome
 * (header band → summary tiles → table) so the Suspense boundary swaps in
 * without a layout shift. Pure placeholder — no new design tokens.
 */
export default function RouteLoading() {
  return (
    <div style={{ padding: 'clamp(1.5rem,4vw,2.5rem)', maxWidth: '960px' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <Skeleton width={70} height={9} />
        <div style={{ marginTop: '10px' }}>
          <Skeleton width={260} height={26} />
        </div>
        <div style={{ marginTop: '8px' }}>
          <Skeleton width={180} height={11} />
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '1px',
          border: `1px solid ${C.border}`,
          borderRadius: '6px',
          overflow: 'hidden',
          background: C.border,
          marginBottom: '1.5rem',
        }}
      >
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ background: C.surface, padding: '0.9rem 1.1rem' }}>
            <Skeleton width={56} height={9} />
            <div style={{ marginTop: '8px' }}>
              <Skeleton width={90} height={18} />
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: '6px',
          padding: '1rem 1.1rem',
        }}
      >
        <SkeletonRows count={6} />
      </div>
    </div>
  )
}
