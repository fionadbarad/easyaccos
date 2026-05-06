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
      return <strong key={i} className="text-[var(--sa-white)] font-semibold">{part.slice(2, -2)}</strong>
    }
    if (part.startsWith('£') || (/^[\d,]+%$/.test(part) && part.length < 8)) {
      return <span key={i} className="text-[#4ADE80] font-mono font-medium">{part}</span>
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={i} className="bg-[rgba(244,245,248,0.08)] rounded-[3px] px-[5px] py-[1px] text-[0.82rem] font-mono">{part.slice(1, -1)}</code>
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
      <ul key={nodes.length} className="my-[0.35rem] pl-[1.1rem] list-none">
        {listItems.map((item, i) => (
          <li key={i} className="text-[var(--sa-white)] text-sm leading-[1.75] relative pl-[0.75rem]">
            <span className="absolute left-0 text-[rgba(244,245,248,0.35)]">·</span>
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
          <p key={nodes.length} className="text-[rgba(244,245,248,0.5)] text-[0.62rem] uppercase tracking-[0.1em] font-mono my-[0.75rem_0_0.25rem] font-semibold">
            {line.slice(3)}
          </p>,
        )
      } else if (line.startsWith('# ')) {
        nodes.push(
          <p key={nodes.length} className="text-[var(--sa-white)] text-[0.95rem] font-semibold my-[0.75rem_0_0.25rem] tracking-[-0.02em]">
            {line.slice(2)}
          </p>,
        )
      } else if (line.trim()) {
        nodes.push(
          <p key={nodes.length} className="text-[var(--sa-white)] text-sm leading-[1.75] my-[0.2rem]">
            {renderInline(line)}
          </p>,
        )
      } else {
        nodes.push(<div key={nodes.length} className="h-[0.4rem]" />)
      }
    }
  }
  flushList()
  return <>{nodes}</>
}

// ── Message components ────────────────────────────────────────────────────────
function UserMessage({ msg }: { msg: KittaxMessage }) {
  return (
    <div className="flex justify-end mb-6">
      <div className="max-w-[68%]">
        <div className="bg-[rgba(244,245,248,0.12)] border border-[var(--sa-border)] rounded-[6px_6px_2px_6px] px-[14px] py-[10px] text-[var(--sa-white)] text-sm leading-[1.65]">
          {msg.content}
        </div>
        <div className="text-right mt-1 text-[rgba(244,245,248,0.2)] text-[0.65rem] font-mono">
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
    <div className="flex gap-3 mb-6">
      <div className="shrink-0 pt-[2px]">
        <div className="w-[1px] min-h-[20px] bg-[rgba(244,245,248,0.15)] ml-[6px]" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[rgba(244,245,248,0.3)] text-[0.62rem] font-mono tracking-[0.08em] mb-1.5">
          ADVISORY · {formatTime(msg.ts)}
        </div>
        <MarkdownBlock text={msg.content} />

        {isLatest && (
          <div className="flex flex-wrap gap-[0.35rem] mt-[0.85rem]">
            {QUICK_ACTIONS.map((a) => (
              <button
                key={a.label}
                onClick={() => onAction(a.q)}
                className="bg-transparent border border-[rgba(244,245,248,0.1)] rounded-[3px] text-[rgba(244,245,248,0.45)] text-[0.65rem] px-[10px] py-[4px] cursor-pointer font-mono tracking-[0.02em] transition-all duration-100"
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
    <div className="flex gap-3 mb-6">
      <div className="shrink-0 pt-[2px]">
        <div className="w-[1px] min-h-[20px] bg-[rgba(244,245,248,0.15)] ml-[6px]" />
      </div>
      <div className="flex-1">
        <div className="text-[rgba(244,245,248,0.3)] text-[0.62rem] font-mono tracking-[0.08em] mb-2">
          ADVISORY
        </div>
        <div className="flex gap-[5px] items-center">
          {[0, 1, 2].map((i) => (
            <div key={i} className="w-[4px] h-[4px] rounded-full bg-[rgba(244,245,248,0.3)]"
              style={{ animation: `ai-pulse 1.2s ease-in-out ${i * 0.2}s infinite` }} />
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

  const { items: expenses } = useUserData<ExpenseStub>('user_expenses', 'easyacco_expenses', [])

  const taxContext: Partial<KittaxContext> = useMemo(() => {
    const base = buildBaseContext()
    const now = new Date()
    const taxYearStart = now.getMonth() >= 3
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
        const data = await res.json()
        if (!res.ok || data.error) throw new Error(data.error || 'No response from server.')
        const reply = typeof data.answer === 'string' ? data.answer
                    : typeof data.reply  === 'string' ? data.reply
                    : 'No response.'
        setMessages([...next, makeMessage('assistant', reply)])
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
    ? messages[messages.length - 1 - lastAssistantIdx].id
    : null

  const ctxSummary = taxContext.totalExpensesYTD != null
    ? `£${taxContext.totalExpensesYTD.toLocaleString('en-GB', { minimumFractionDigits: 2 })} expenses YTD · ${taxContext.currentMonth}`
    : taxContext.currentMonth

  return (
    <div className="p-[clamp(1.5rem,3vw,2.5rem)] max-w-[720px] flex flex-col h-[calc(100vh-52px)] md:h-screen">

      {/* Header */}
      <div className="flex items-start justify-between mb-8 flex-wrap gap-2 shrink-0">
        <div>
          <h1 className="text-[var(--sa-white)] text-[clamp(1.2rem,2.5vw,1.5rem)] font-semibold tracking-[-0.03em] m-0">
            Tax Advisory
          </h1>
          <p className="text-[rgba(244,245,248,0.42)] text-[0.72rem] mt-[3px] mb-0 font-mono">
            {ctxSummary}
          </p>
        </div>
        <button onClick={reset}
          className="flex items-center gap-1.5 bg-transparent border border-[var(--sa-border)] rounded text-[rgba(244,245,248,0.42)] text-[0.72rem] px-[11px] py-[6px] cursor-pointer tracking-[-0.01em]">
          <RefreshCw size={11} /> New session
        </button>
      </div>

      {/* Conversation */}
      <div className="flex-1 overflow-y-auto pr-[4px] mb-4">
        {messages.map((m) =>
          m.role === 'user'
            ? <UserMessage key={m.id} msg={m} />
            : <AssistantMessage key={m.id} msg={m} isLatest={m.id === lastAssistantId} onAction={send} />,
        )}
        {loading && <ThinkingIndicator />}
        {error && (
          <div role="alert" className="bg-[rgba(248,113,113,0.06)] border border-[rgba(248,113,113,0.18)] rounded px-[14px] py-[10px] text-[#F87171] text-[0.78rem] mb-6">
            {error}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggested topics */}
      {showSuggested && (
        <div className="shrink-0 mb-4">
          <div className="text-[rgba(244,245,248,0.2)] text-[0.6rem] uppercase tracking-[0.1em] font-mono mb-2">
            Common topics
          </div>
          <div className="grid gap-[0.35rem]" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))' }}>
            {SUGGESTED.map((s) => (
              <button key={s.label} onClick={() => send(s.q)} className="ai-suggestion-btn">
                <span>{s.label}</span>
                <ChevronRight size={11} className="shrink-0 opacity-40" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="shrink-0 bg-[var(--sa-surface)] border border-[var(--sa-border)] rounded-md overflow-hidden">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Ask a question…   (Enter to send, Shift+Enter for new line)"
          rows={2}
          aria-label="Tax question"
          className="block w-full bg-transparent border-none p-[12px_14px_4px] text-[var(--sa-white)] text-sm outline-none resize-none leading-[1.6] box-border"
        />
        <div className="flex items-center justify-end px-[8px] pb-[8px] pt-[4px] gap-1.5">
          <span className="text-[rgba(244,245,248,0.15)] text-[0.62rem] font-mono mr-auto">
            {input.length > 0 ? `${input.length} chars` : ''}
          </span>
          <button onClick={() => send()} disabled={!canSend}
            className={`flex items-center gap-[5px] rounded px-[12px] py-[6px] text-xs font-semibold tracking-[-0.01em] transition-all duration-100 border ${canSend ? 'bg-[var(--sa-white)] text-[var(--sa-black)] border-[var(--sa-white)] cursor-pointer' : 'bg-transparent text-[rgba(244,245,248,0.42)] border-[var(--sa-border)] cursor-default'}`}>
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
