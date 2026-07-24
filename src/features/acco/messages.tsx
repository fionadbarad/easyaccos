import type { AccoMessage } from '@/lib/acco/types'
import { MarkdownBlock } from './Markdown'

// Action buttons that appear after the latest assistant response.
const QUICK_ACTIONS = [
  { label: 'Calculate my tax', q: 'Can you calculate my full income tax and NI liability?' },
  { label: 'Expenses I can claim', q: 'What expenses can I claim to reduce my tax bill?' },
  { label: 'Pension strategy', q: 'How can I use pension contributions to reduce my tax?' },
]

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

export function UserMessage({ msg }: { msg: AccoMessage }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.5rem' }}>
      <div style={{ maxWidth: '68%' }}>
        <div
          style={{
            background: 'rgba(244,245,248,0.12)',
            border: '1px solid var(--sa-border)',
            borderRadius: '6px 6px 2px 6px',
            padding: '10px 14px',
            color: 'var(--sa-white)',
            fontSize: '0.9375rem',
            lineHeight: 1.65,
          }}
        >
          {msg.content}
        </div>
        <div
          style={{
            textAlign: 'right',
            marginTop: '4px',
            color: 'rgba(244,245,248,0.2)',
            fontSize: '0.72rem',
            fontFamily: 'var(--font-geist-mono), monospace',
          }}
        >
          {formatTime(msg.ts)}
        </div>
      </div>
    </div>
  )
}

export function AssistantMessage({
  msg,
  isLatest,
  onAction,
}: {
  msg: AccoMessage
  isLatest: boolean
  onAction: (q: string) => void
}) {
  return (
    <div style={{ display: 'flex', gap: '12px', marginBottom: '1.5rem' }}>
      <div style={{ flexShrink: 0, paddingTop: '2px' }}>
        <div
          style={{
            width: '1px',
            minHeight: '20px',
            background: 'rgba(244,245,248,0.15)',
            marginLeft: '6px',
          }}
        />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            color: 'rgba(244,245,248,0.3)',
            fontSize: '0.72rem',
            fontFamily: 'var(--font-geist-mono), monospace',
            letterSpacing: '0.08em',
            marginBottom: '6px',
          }}
        >
          {msg.offline ? 'OFFLINE · GENERIC ANSWER' : 'ADVISORY'} · {formatTime(msg.ts)}
        </div>
        {msg.offline && (
          <div
            role="status"
            aria-live="polite"
            style={{
              background: 'rgba(250,204,21,0.06)',
              border: '1px solid rgba(250,204,21,0.22)',
              borderRadius: '4px',
              padding: '8px 12px',
              marginBottom: '10px',
              color: '#FACC15',
              fontSize: '0.8rem',
              lineHeight: 1.45,
              fontFamily: 'var(--font-geist-mono), monospace',
            }}
          >
            The live advisor is unavailable. This is a canned reply matched on keywords — accurate
            for HMRC 2026/27 thresholds, but not tailored to your numbers. Try again shortly for a
            full advisory response.
          </div>
        )}
        <MarkdownBlock text={msg.content} />

        {/* Contextual action buttons on latest assistant message */}
        {isLatest && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.85rem' }}>
            {QUICK_ACTIONS.map((a) => (
              <button
                key={a.label}
                onClick={() => onAction(a.q)}
                style={{
                  background: 'transparent',
                  border: '1px solid rgba(244,245,248,0.1)',
                  borderRadius: '3px',
                  color: 'rgba(244,245,248,0.45)',
                  fontSize: '0.75rem',
                  padding: '4px 10px',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-geist-mono), monospace',
                  letterSpacing: '0.02em',
                  transition: 'all 0.1s',
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLElement
                  el.style.borderColor = 'rgba(244,245,248,0.25)'
                  el.style.color = 'rgba(244,245,248,0.75)'
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLElement
                  el.style.borderColor = 'rgba(244,245,248,0.1)'
                  el.style.color = 'rgba(244,245,248,0.45)'
                }}
              >
                {a.label} →
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export function ThinkingIndicator() {
  return (
    <div style={{ display: 'flex', gap: '12px', marginBottom: '1.5rem' }}>
      <div style={{ flexShrink: 0, paddingTop: '2px' }}>
        <div
          style={{
            width: '1px',
            minHeight: '20px',
            background: 'rgba(244,245,248,0.15)',
            marginLeft: '6px',
          }}
        />
      </div>
      <div style={{ flex: 1 }}>
        <div
          style={{
            color: 'rgba(244,245,248,0.3)',
            fontSize: '0.72rem',
            fontFamily: 'var(--font-geist-mono), monospace',
            letterSpacing: '0.08em',
            marginBottom: '8px',
          }}
        >
          ADVISORY
        </div>
        <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                width: '4px',
                height: '4px',
                borderRadius: '50%',
                background: 'rgba(244,245,248,0.3)',
                animation: `ai-pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
