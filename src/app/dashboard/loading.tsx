export default function DashboardLoading() {
  return (
    <div style={{
      padding: 'clamp(1.5rem,4vw,2.5rem)',
      maxWidth: '880px',
      margin: '0 auto',
    }}>
      {/* Page title skeleton */}
      <div style={{
        width: '200px', height: '28px',
        background: 'rgba(234,179,8,0.08)',
        borderRadius: '6px',
        marginBottom: '0.5rem',
        animation: 'pulse 1.5s ease-in-out infinite',
      }} />
      <div style={{
        width: '320px', height: '14px',
        background: 'rgba(234,179,8,0.05)',
        borderRadius: '4px',
        marginBottom: '2rem',
        animation: 'pulse 1.5s ease-in-out infinite',
        animationDelay: '0.15s',
      }} />

      {/* Card skeletons */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))',
        gap: '1rem',
      }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} style={{
            height: '80px',
            background: 'rgba(234,179,8,0.04)',
            border: '1px solid rgba(234,179,8,0.08)',
            borderRadius: '6px',
            animation: 'pulse 1.5s ease-in-out infinite',
            animationDelay: `${i * 0.08}s`,
          }} />
        ))}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  )
}
