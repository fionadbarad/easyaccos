'use client'

import { useRef } from 'react'
import { Send, RefreshCw, ChevronRight } from 'lucide-react'
import { useAccoChat } from '@/features/acco/useAccoChat'
import { UserMessage, AssistantMessage, ThinkingIndicator } from '@/features/acco/messages'
import { SUGGESTED } from '@/features/acco/suggestions'

export default function AIPage() {
  const {
    messages,
    input,
    setInput,
    loading,
    error,
    send,
    reset,
    ctxSummary,
    showSuggested,
    canSend,
    lastAssistantId,
    bottomRef,
  } = useAccoChat()

  const textareaRef = useRef<HTMLTextAreaElement>(null)

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <div
      style={{
        padding: 'clamp(1.5rem,3vw,2.5rem)',
        maxWidth: '720px',
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 52px)',
      }}
      className="md:h-screen"
    >
      {/* ── Header ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: '2rem',
          flexWrap: 'wrap',
          gap: '0.5rem',
          flexShrink: 0,
        }}
      >
        <div>
          <h1
            style={{
              color: 'var(--sa-white)',
              fontSize: 'clamp(1.2rem,2.5vw,1.5rem)',
              fontWeight: 600,
              letterSpacing: '-0.03em',
              margin: 0,
            }}
          >
            Tax Advisory
          </h1>
          <p
            style={{
              color: 'var(--sa-muted)',
              fontSize: '0.8rem',
              margin: '3px 0 0',
              fontFamily: 'var(--font-geist-mono), monospace',
            }}
          >
            {ctxSummary}
          </p>
        </div>
        <button
          onClick={reset}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'transparent',
            border: '1px solid var(--sa-border)',
            borderRadius: '4px',
            color: 'var(--sa-muted)',
            fontSize: '0.8rem',
            padding: '6px 11px',
            cursor: 'pointer',
            letterSpacing: '-0.01em',
          }}
        >
          <RefreshCw size={11} /> New session
        </button>
      </div>

      {/* ── Conversation ── */}
      <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px', marginBottom: '1rem' }}>
        {messages.map((m) =>
          m.role === 'user' ? (
            <UserMessage key={m.id} msg={m} />
          ) : (
            <AssistantMessage
              key={m.id}
              msg={m}
              isLatest={m.id === lastAssistantId}
              onAction={send}
            />
          ),
        )}
        {loading && <ThinkingIndicator />}
        {error && (
          <div
            role="alert"
            style={{
              background: 'rgba(248,113,113,0.06)',
              border: '1px solid rgba(248,113,113,0.18)',
              borderRadius: '4px',
              padding: '10px 14px',
              color: '#F87171',
              fontSize: '0.85rem',
              marginBottom: '1.5rem',
            }}
          >
            {error}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* ── Suggested topics ── */}
      {showSuggested && (
        <div style={{ flexShrink: 0, marginBottom: '1rem' }}>
          <div
            style={{
              color: 'rgba(244,245,248,0.2)',
              fontSize: '0.7rem',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              fontFamily: 'var(--font-geist-mono), monospace',
              marginBottom: '0.5rem',
            }}
          >
            Common topics
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))',
              gap: '0.35rem',
            }}
          >
            {SUGGESTED.map((s) => (
              <button key={s.label} onClick={() => send(s.q)} className="ai-suggestion-btn">
                <span>{s.label}</span>
                <ChevronRight size={11} style={{ flexShrink: 0, opacity: 0.4 }} />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Input ── */}
      <div
        style={{
          flexShrink: 0,
          background: 'var(--sa-surface)',
          border: '1px solid var(--sa-border)',
          borderRadius: '6px',
          overflow: 'hidden',
        }}
      >
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Ask a question…   (Enter to send, Shift+Enter for new line)"
          rows={2}
          aria-label="Tax question"
          style={{
            display: 'block',
            width: '100%',
            background: 'transparent',
            border: 'none',
            padding: '12px 14px 4px',
            color: 'var(--sa-white)',
            fontSize: '0.9375rem',
            outline: 'none',
            resize: 'none',
            lineHeight: 1.6,
            boxSizing: 'border-box',
          }}
        />
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            padding: '4px 8px 8px',
            gap: '6px',
          }}
        >
          <span
            style={{
              color: 'rgba(244,245,248,0.15)',
              fontSize: '0.72rem',
              fontFamily: 'var(--font-geist-mono), monospace',
              marginRight: 'auto',
            }}
          >
            {input.length > 0 ? `${input.length} chars` : ''}
          </span>
          <button
            onClick={() => send()}
            disabled={!canSend}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              background: canSend ? 'var(--sa-white)' : 'transparent',
              border: `1px solid ${canSend ? 'var(--sa-white)' : 'var(--sa-border)'}`,
              borderRadius: '4px',
              padding: '6px 12px',
              color: canSend ? 'var(--sa-black)' : 'var(--sa-muted)',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: canSend ? 'pointer' : 'default',
              transition: 'all 0.1s',
              letterSpacing: '-0.01em',
            }}
          >
            <Send size={12} strokeWidth={2} /> Send
          </button>
        </div>
      </div>

      <style>{`
        @keyframes ai-pulse {
          0%, 100% { opacity: 0.2; transform: scale(0.85); }
          50%       { opacity: 1;   transform: scale(1.1);  }
        }
      `}</style>
    </div>
  )
}
