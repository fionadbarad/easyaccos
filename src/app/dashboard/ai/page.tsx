'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { Send, RefreshCw, ChevronRight, TrendingDown, PiggyBank, FileText, Calendar } from 'lucide-react'
import { useUserData } from '@/lib/use-user-data'
import { buildBaseContext, buildContextPrompt } from '@/lib/kittax/context'
import type { KittaxContext, KittaxMessage } from '@/lib/kittax/types'

const FETCH_TIMEOUT = 30_000

const SUGGESTED = [
  { label: 'Sole trader tax',     icon: TrendingDown, q: 'How much tax and NI will I pay on £55,000 self-employed profit?' },
  { label: 'Dividend structure',  icon: PiggyBank,    q: 'What is the optimal salary/dividend split for a director in 2026/27?' },
  { label: 'Pension relief',      icon: PiggyBank,    q: 'How do SIPP contributions reduce my tax bill if I earn over £100,000?' },
  { label: 'MTD obligations',     icon: Calendar,     q: 'When are my quarterly MTD submissions due for 2026/27?' },
  { label: 'Allowable expenses',  icon: FileText,     q: 'What home office expenses can I claim as a sole trader?' },
  { label: 'Payment on account',  icon: FileText,     q: 'How does payment on account work and how do I reduce it?' },
]

// Action buttons that appear after each assistant response
const QUICK_ACTIONS = [
  { label: 'Calculate my tax',    q: 'Can you calculate my full income tax and NI liability?' },
  { label: 'Expenses I can claim', q: 'What expenses can I claim to reduce my tax bill?' },
  { label: 'Pension strategy',    q: 'How can I use pension contributions to reduce my tax?' },
]

function makeMessage(role: KittaxMessage['role'], content: string): KittaxMessage {
  return { id: crypto.randomUUID(), role, content, ts: Date.now() }
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

// ── Inline markdown renderer ──────────────────────────────────────────────────
function renderInline(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|£[\d,]+(?:\.\d{2})?%?|`[^`]+`)/)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} style={{ color: '#F4F5F8', fontWeight: 600 }}>{part.slice(2, -2)}</strong>
    }
    if (part.startsWith('£') || (/^[\d,]+%$/.test(part) && part.length < 8)) {
      return <span key={i} style={{ color: '#4ADE80', fontFamily: 'var(--font-geist-mono), monospace', fontWeight: 500 }}>{part}</span>
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={i} style={{ background: 'rgba(244,245,248,0.08)', borderRadius: '3px', padding: '1px 5px', fontSize: '0.82rem', fontFamily: 'var(--font-geist-mono), monospace' }}>{part.slice(1, -1)}</code>
    }
    return <span key={i}>{part}</span>
  })
}

function MarkdownBlock({ text }: { text: string }) {
  const lines = text.split('\n')
  const nodes: React.ReactNode[] = []
  let listItems: string[] = []

  function flushList() {
    if (listItems.length === 0) return
    nodes.push(
      <ul key={nodes.length} style={{ margin: '0.35rem 0', paddingLeft: '1.1rem', listStyle: 'none' }}>
        {listItems.map((item, i) => (
          <li key={i} style={{ color: 'var(--sa-white)', fontSize: '0.875rem', lineHeight: 1.75, position: 'relative', paddingLeft: '0.75rem' }}>
            <span style={{ position: 'absolute', left: 0, color: 'rgba(244,245,248,0.35)' }}>·</span>
            {renderInline(item)}
          </li>
        ))}
      </ul>,
    )
    listItems = []
  }

  for (const line of lines) {
    if (line.startsWith('• ') || line.startsWith('- ') || line.startsWith('* ')) {
      listItems.push(line.slice(2))
    } else if (/^\d+\.\s/.test(line)) {
      listItems.push(line.replace(/^\d+\.\s/, ''))
    } else {
      flushList()
      if (line.startsWith('## ')) {
        nodes.push(
          <p key={nodes.length} style={{ color: 'rgba(244,245,248,0.5)', fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'var(--font-geist-mono), monospace', margin: '0.75rem 0 0.25rem', fontWeight: 600 }}>
            {line.slice(3)}
          </p>,
        )
      } else if (line.startsWith('# ')) {
        nodes.push(
          <p key={nodes.length} style={{ color: 'var(--sa-white)', fontSize: '0.95rem', fontWeight: 600, margin: '0.75rem 0 0.25rem', letterSpacing: '-0.02em' }}>
            {line.slice(2)}
          </p>,
        )
      } else if (line.trim()) {
        nodes.push(
          <p key={nodes.length} style={{ color: 'var(--sa-white)', fontSize: '0.875rem', lineHeight: 1.75, margin: '0.2rem 0' }}>
            {renderInline(line)}
          </p>,
        )
      } else {
        nodes.push(<div key={nodes.length} style={{ height: '0.4rem' }} />)
      }
    }
  }
  flushList()
  return <>{nodes}</>
}

// ── Message components ────────────────────────────────────────────────────────
function UserMessage({ msg }: { msg: KittaxMessage }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.5rem' }}>
      <div style={{ maxWidth: '68%' }}>
        <div style={{ background: 'rgba(244,245,248,0.12)', border: '1px solid var(--sa-border)', borderRadius: '6px 6px 2px 6px', padding: '10px 14px', color: 'var(--sa-white)', fontSize: '0.875rem', lineHeight: 1.65 }}>
          {msg.content}
        </div>
        <div style={{ textAlign: 'right', marginTop: '4px', color: 'rgba(244,245,248,0.2)', fontSize: '0.65rem', fontFamily: 'var(--font-geist-mono), monospace' }}>
          {formatTime(msg.ts)}
        </div>
      </div>
    </div>
  )
}

function AssistantMessage({
  msg,
  isLatest,
  onAction,
}: {
  msg: KittaxMessage
  isLatest: boolean
  onAction: (q: string) => void
}) {
  return (
    <div style={{ display: 'flex', gap: '12px', marginBottom: '1.5rem' }}>
      <div style={{ flexShrink: 0, paddingTop: '2px' }}>
        <div style={{ width: '1px', minHeight: '20px', background: 'rgba(244,245,248,0.15)', marginLeft: '6px' }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: 'rgba(244,245,248,0.3)', fontSize: '0.62rem', fontFamily: 'var(--font-geist-mono), monospace', letterSpacing: '0.08em', marginBottom: '6px' }}>
          ADVISORY · {formatTime(msg.ts)}
        </div>
        <MarkdownBlock text={msg.content} />

        {/* Contextual action buttons on latest assistant message */}
        {isLatest && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.85rem' }}>
            {QUICK_ACTIONS.map((a) => (
              <button
                key={a.label}
                onClick={() => onAction(a.q)}
                style={{
                  background: 'transparent', border: '1px solid rgba(244,245,248,0.1)',
                  borderRadius: '3px', color: 'rgba(244,245,248,0.45)', fontSize: '0.65rem',
                  padding: '4px 10px', cursor: 'pointer', fontFamily: 'var(--font-geist-mono), monospace',
                  letterSpacing: '0.02em', transition: 'all 0.1s',
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
            <div key={i} style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'rgba(244,245,248,0.3)', animation: `ai-pulse 1.2s ease-in-out ${i * 0.2}s infinite` }} />
          ))}
        </div>
      </div>
    </div>
  )
}

function greetingByHour() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

// ── Dummy expense type for context loading ────────────────────────────────────
interface ExpenseStub { id: string; amount: number; date: string }

export default function AIPage() {
  const INITIAL_MESSAGE = useMemo(() => makeMessage(
    'assistant',
    `${greetingByHour()} — I'm your personal tax advisor, aligned to HMRC rules for the 2026/27 fiscal year.\n\nI can walk through sole-trader income, director pay, dividends, MTD deadlines, allowable expenses, National Insurance, the 60% trap — whatever's on your mind. Tell me roughly what you earn and where the friction is, and I'll take it from there.\n\nWhat shall we look at first?`,
  ), [])

  const [messages, setMessages] = useState<KittaxMessage[]>([INITIAL_MESSAGE])
  const [input,    setInput]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  const bottomRef   = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const abortRef    = useRef<AbortController | null>(null)

  // Load user's expenses for context injection
  const { items: expenses } = useUserData<ExpenseStub>('user_expenses', 'easyacco_expenses', [])

  const taxContext: Partial<KittaxContext> = useMemo(() => {
    const base = buildBaseContext()
    // Sum expenses from the current tax year (6 Apr – 5 Apr)
    const now = new Date()
    const taxYearStart = now.getMonth() >= 3   // April = 3
      ? new Date(now.getFullYear(), 3, 6)
      : new Date(now.getFullYear() - 1, 3, 6)
    const totalExpensesYTD = expenses
      .filter((e) => new Date(e.date) >= taxYearStart)
      .reduce((s, e) => s + (e.amount || 0), 0)
    return {
      ...base,
      totalExpensesYTD: totalExpensesYTD > 0 ? totalExpensesYTD : undefined,
    }
  }, [expenses])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

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
    const controller = new AbortController()
    abortRef.current = controller
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT)

    const history = next.slice(1, -1).map((m) => ({
      role:  m.role === 'user' ? 'user' : ('model' as const),
      parts: [{ text: m.content }],
    }))

    try {
      const res = await fetch('/api/ai/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ message: msg, history, context: taxContext }),
        signal:  controller.signal,
      })

      const isStreaming = res.headers.get('X-Streaming') === 'true'

      if (isStreaming && res.body) {
        // Real streaming — read chunks and update the last message progressively
        const reader  = res.body.getReader()
        const decoder = new TextDecoder()
        let accumulated = ''

        const streamMsg = makeMessage('assistant', '')
        setMessages([...next, streamMsg])
        setLoading(false)

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          accumulated += decoder.decode(value, { stream: true })
          setMessages([...next, { ...streamMsg, content: accumulated }])
        }
      } else {
        // JSON fallback (offline mode)
        const data = await res.json()
        if (!res.ok || data.error) throw new Error(data.error || 'No response from server.')
        setMessages([...next, makeMessage('assistant', data.answer || data.reply || 'No response.')])
      }
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
  const canSend = !loading && input.trim().length > 0
  const lastAssistantIdx = [...messages].reverse().findIndex((m) => m.role === 'assistant')
  const lastAssistantId  = lastAssistantIdx >= 0
    ? messages[messages.length - 1 - lastAssistantIdx]?.id ?? null
    : null

  // Context summary for the UI
  const ctxSummary = taxContext.totalExpensesYTD != null
    ? `£${taxContext.totalExpensesYTD.toLocaleString('en-GB', { minimumFractionDigits: 2 })} expenses YTD · ${taxContext.currentMonth}`
    : taxContext.currentMonth

  return (
    <div style={{ padding: 'clamp(1.5rem,3vw,2.5rem)', maxWidth: '720px', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 52px)' }} className="md:h-screen">

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '0.5rem', flexShrink: 0 }}>
        <div>
          <h1 style={{ color: 'var(--sa-white)', fontSize: 'clamp(1.2rem,2.5vw,1.5rem)', fontWeight: 600, letterSpacing: '-0.03em', margin: 0 }}>
            Tax Advisory
          </h1>
          <p style={{ color: 'var(--sa-muted)', fontSize: '0.72rem', margin: '3px 0 0', fontFamily: 'var(--font-geist-mono), monospace' }}>
            {ctxSummary}
          </p>
        </div>
        <button onClick={reset}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'transparent', border: '1px solid var(--sa-border)', borderRadius: '4px', color: 'var(--sa-muted)', fontSize: '0.72rem', padding: '6px 11px', cursor: 'pointer', letterSpacing: '-0.01em' }}>
          <RefreshCw size={11} /> New session
        </button>
      </div>

      {/* ── Conversation ── */}
      <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px', marginBottom: '1rem' }}>
        {messages.map((m) =>
          m.role === 'user'
            ? <UserMessage key={m.id} msg={m} />
            : <AssistantMessage key={m.id} msg={m} isLatest={m.id === lastAssistantId} onAction={send} />,
        )}
        {loading && <ThinkingIndicator />}
        {error && (
          <div role="alert" style={{ background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.18)', borderRadius: '4px', padding: '10px 14px', color: '#F87171', fontSize: '0.78rem', marginBottom: '1.5rem' }}>
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
              <button key={s.label} onClick={() => send(s.q)} className="ai-suggestion-btn">
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
          style={{ display: 'block', width: '100%', background: 'transparent', border: 'none', padding: '12px 14px 4px', color: 'var(--sa-white)', fontSize: '0.875rem', outline: 'none', resize: 'none', lineHeight: 1.6, boxSizing: 'border-box' }}
        />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '4px 8px 8px', gap: '6px' }}>
          <span style={{ color: 'rgba(244,245,248,0.15)', fontSize: '0.62rem', fontFamily: 'var(--font-geist-mono), monospace', marginRight: 'auto' }}>
            {input.length > 0 ? `${input.length} chars` : ''}
          </span>
          <button onClick={() => send()} disabled={!canSend}
            style={{ display: 'flex', alignItems: 'center', gap: '5px', background: canSend ? 'var(--sa-white)' : 'transparent', border: `1px solid ${canSend ? 'var(--sa-white)' : 'var(--sa-border)'}`, borderRadius: '4px', padding: '6px 12px', color: canSend ? 'var(--sa-black)' : 'var(--sa-muted)', fontSize: '0.75rem', fontWeight: 600, cursor: canSend ? 'pointer' : 'default', transition: 'all 0.1s', letterSpacing: '-0.01em' }}>
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
