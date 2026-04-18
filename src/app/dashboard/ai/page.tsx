'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, RefreshCw, ChevronRight } from 'lucide-react'

const FETCH_TIMEOUT = 15_000   // abort stalled AI requests after 15 s

type Role = 'user' | 'assistant'

interface Message {
  id:      string
  role:    Role
  content: string
  ts:      number
}

const SUGGESTED = [
  { label: 'Sole trader tax',     q: 'How much tax and NI will I pay on £55,000 self-employed profit?' },
  { label: 'Dividend structure',  q: 'What is the optimal salary/dividend split for a director in 2026/27?' },
  { label: 'Pension relief',      q: 'How do SIPP contributions reduce my tax bill if I earn over £100,000?' },
  { label: 'MTD obligations',     q: 'When are my quarterly MTD submissions due for 2026/27?' },
  { label: 'Allowable expenses',  q: 'What home office expenses can I claim as a sole trader?' },
  { label: 'Payment on account',  q: 'How does payment on account work and how do I reduce it?' },
]

function makeMessage(role: Role, content: string): Message {
  return { id: crypto.randomUUID(), role, content, ts: Date.now() }
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

function AdvisoryMessage({ msg }: { msg: Message }) {
  const isUser = msg.role === 'user'

  if (isUser) {
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.5rem' }}>
        <div style={{ maxWidth: '68%' }}>
          <div style={{
            background:   'rgba(244,245,248,0.12)',
            border:       '1px solid var(--sa-border)',
            borderRadius: '6px 6px 2px 6px',
            padding:      '10px 14px',
            color:        'var(--sa-white)',
            fontSize:     '0.875rem',
            lineHeight:   1.65,
          }}>
            {msg.content}
          </div>
          <div style={{ textAlign: 'right', marginTop: '4px', color: 'rgba(244,245,248,0.2)', fontSize: '0.65rem', fontFamily: 'var(--font-geist-mono), monospace' }}>
            {formatTime(msg.ts)}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', gap: '12px', marginBottom: '1.5rem' }}>
      <div style={{ flexShrink: 0, paddingTop: '2px' }}>
        <div style={{ width: '1px', height: '100%', minHeight: '20px', background: 'rgba(244,245,248,0.15)', marginLeft: '6px' }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: 'rgba(244,245,248,0.3)', fontSize: '0.62rem', fontFamily: 'var(--font-geist-mono), monospace', letterSpacing: '0.08em', marginBottom: '6px' }}>
          ADVISORY · {formatTime(msg.ts)}
        </div>
        <div style={{ color: 'var(--sa-white)', fontSize: '0.875rem', lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>
          {msg.content}
        </div>
      </div>
    </div>
  )
}

function ThinkingIndicator() {
  return (
    <div style={{ display: 'flex', gap: '12px', marginBottom: '1.5rem' }}>
      <div style={{ flexShrink: 0, paddingTop: '2px' }}>
        <div style={{ width: '1px', minHeight: '20px', background: 'rgba(244,245,248,0.15)', marginLeft: '6px' }} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ color: 'rgba(244,245,248,0.3)', fontSize: '0.62rem', fontFamily: 'var(--font-geist-mono), monospace', letterSpacing: '0.08em', marginBottom: '8px' }}>
          ADVISORY
        </div>
        <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{
              width: '4px', height: '4px', borderRadius: '50%',
              background: 'rgba(244,245,248,0.3)',
              animation: `ai-pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
            }} />
          ))}
        </div>
      </div>
    </div>
  )
}

const INITIAL_MESSAGE = makeMessage(
  'assistant',
  'Good day. I can advise on UK tax obligations for the 2026/27 fiscal year — sole trader and partnership income, director remuneration, MTD compliance, allowable deductions, and NI liabilities. What would you like to work through?',
)

export default function AIPage() {
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE])
  const [input,    setInput]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  const bottomRef   = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const abortRef    = useRef<AbortController | null>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // Clean up any in-flight request when the component unmounts.
  useEffect(() => () => abortRef.current?.abort(), [])

  async function send(text?: string) {
    const msg = (text ?? input).trim()
    if (!msg || loading) return

    setInput('')
    setError('')

    const userMsg = makeMessage('user', msg)
    const next    = [...messages, userMsg]
    setMessages(next)
    setLoading(true)

    abortRef.current?.abort()
    const controller  = new AbortController()
    abortRef.current  = controller
    const timeout     = setTimeout(() => controller.abort(), FETCH_TIMEOUT)

    const history = next.slice(1, -1).map((m) => ({
      role:  m.role === 'user' ? 'user' : ('model' as const),
      parts: [{ text: m.content }],
    }))

    try {
      const res  = await fetch('/api/ai/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ message: msg, history }),
        signal:  controller.signal,
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error || 'No response from server.')
      setMessages([...next, makeMessage('assistant', data.answer || data.reply || 'No response.')])
    } catch (err: unknown) {
      if ((err as Error).name === 'AbortError') {
        setError('Response timed out. Please try again.')
      } else {
        setError(err instanceof Error ? err.message : 'Something went wrong.')
      }
      setMessages(next)
    } finally {
      clearTimeout(timeout)
      setLoading(false)
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  function reset() {
    abortRef.current?.abort()
    setMessages([makeMessage('assistant', 'Session cleared. What do you need to work through?')])
    setError('')
    setLoading(false)
  }

  const showSuggested = messages.length <= 1
  const canSend       = !loading && input.trim().length > 0

  return (
    <div style={{
      padding:        'clamp(1.5rem,3vw,2.5rem)',
      maxWidth:       '720px',
      display:        'flex',
      flexDirection:  'column',
      height:         'calc(100vh - 52px)',
    }} className="md:h-screen">

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '0.5rem', flexShrink: 0 }}>
        <div>
          <h1 style={{ color: 'var(--sa-white)', fontSize: 'clamp(1.2rem,2.5vw,1.5rem)', fontWeight: 600, letterSpacing: '-0.03em', margin: 0 }}>
            Tax Advisory
          </h1>
          <p style={{ color: 'var(--sa-muted)', fontSize: '0.72rem', margin: '3px 0 0', fontFamily: 'var(--font-geist-mono), monospace' }}>
            2026/27 HMRC rules · sole trader · director · MTD
          </p>
        </div>
        <button
          onClick={reset}
          style={{
            display:    'flex',
            alignItems: 'center',
            gap:        '6px',
            background: 'transparent',
            border:     '1px solid var(--sa-border)',
            borderRadius: '4px',
            color:      'var(--sa-muted)',
            fontSize:   '0.72rem',
            padding:    '6px 11px',
            cursor:     'pointer',
            letterSpacing: '-0.01em',
          }}
        >
          <RefreshCw size={11} /> New session
        </button>
      </div>

      {/* ── Conversation ── */}
      <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px', marginBottom: '1rem' }}>
        {messages.map((m) => <AdvisoryMessage key={m.id} msg={m} />)}
        {loading && <ThinkingIndicator />}
        {error && (
          <div role="alert" style={{
            background:   'rgba(248,113,113,0.06)',
            border:       '1px solid rgba(248,113,113,0.18)',
            borderRadius: '4px',
            padding:      '10px 14px',
            color:        '#F87171',
            fontSize:     '0.78rem',
            marginBottom: '1.5rem',
          }}>
            {error}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* ── Suggested topics ── */}
      {showSuggested && (
        <div style={{ flexShrink: 0, marginBottom: '1rem' }}>
          <div style={{ color: 'rgba(244,245,248,0.2)', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'var(--font-geist-mono), monospace', marginBottom: '0.5rem' }}>
            Common topics
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: '0.35rem' }}>
            {SUGGESTED.map((s) => (
              <button
                key={s.label}
                onClick={() => send(s.q)}
                className="ai-suggestion-btn"
              >
                <span>{s.label}</span>
                <ChevronRight size={11} style={{ flexShrink: 0, opacity: 0.4 }} />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Input ── */}
      <div style={{ flexShrink: 0, background: 'var(--sa-surface)', border: '1px solid var(--sa-border)', borderRadius: '6px', overflow: 'hidden' }}>
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Ask a question…   (Enter to send, Shift+Enter for new line)"
          rows={2}
          aria-label="Tax question"
          style={{
            display:     'block',
            width:       '100%',
            background:  'transparent',
            border:      'none',
            padding:     '12px 14px 4px',
            color:       'var(--sa-white)',
            fontSize:    '0.875rem',
            outline:     'none',
            resize:      'none',
            lineHeight:  1.6,
            boxSizing:   'border-box',
          }}
        />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '4px 8px 8px', gap: '6px' }}>
          <span style={{ color: 'rgba(244,245,248,0.15)', fontSize: '0.62rem', fontFamily: 'var(--font-geist-mono), monospace', marginRight: 'auto' }}>
            {input.length > 0 ? `${input.length} chars` : ''}
          </span>
          <button
            onClick={() => send()}
            disabled={!canSend}
            style={{
              display:      'flex',
              alignItems:   'center',
              gap:          '5px',
              background:   canSend ? 'var(--sa-white)' : 'transparent',
              border:       `1px solid ${canSend ? 'var(--sa-white)' : 'var(--sa-border)'}`,
              borderRadius: '4px',
              padding:      '6px 12px',
              color:        canSend ? 'var(--sa-black)' : 'var(--sa-muted)',
              fontSize:     '0.75rem',
              fontWeight:   600,
              cursor:       canSend ? 'pointer' : 'default',
              transition:   'all 0.1s',
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
