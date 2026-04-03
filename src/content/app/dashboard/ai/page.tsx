'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, Loader2, RefreshCw } from 'lucide-react'
import Kittax from '@/components/Kittax'

const C = { bg: '#1A2342', deep: '#0F1628', card: '#4A4066', gold: '#C2A368', text: '#E4D3B4', muted: 'rgba(228,211,180,0.55)', border: 'rgba(194,163,104,0.2)' }

type Role = 'user' | 'assistant'
interface Message { role: Role; content: string }

const STARTERS = [
  'How much tax will I pay on £40,000 self-employed income?',
  'What expenses can I deduct as a freelancer?',
  'When is the Self-Assessment deadline?',
  'Should I pay voluntary Class 2 NI?',
  'What is "payment on account"?',
]

function ChatBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === 'user'
  return (
    <div style={{ display: 'flex', gap: '10px', justifyContent: isUser ? 'flex-end' : 'flex-start', marginBottom: '1rem' }}>
      {!isUser && (
        <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'rgba(194,163,104,0.15)', border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Bot size={15} style={{ color: C.gold }} />
        </div>
      )}
      <div style={{
        maxWidth: '78%', padding: '11px 15px', borderRadius: isUser ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
        background: isUser ? 'rgba(194,163,104,0.15)' : C.card,
        border: `1px solid ${isUser ? 'rgba(194,163,104,0.3)' : C.border}`,
        color: C.text, fontSize: '0.875rem', lineHeight: 1.65,
        whiteSpace: 'pre-wrap',
      }}>
        {msg.content}
      </div>
      {isUser && (
        <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'rgba(194,163,104,0.15)', border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <User size={15} style={{ color: C.gold }} />
        </div>
      )}
    </div>
  )
}

export default function AIPage() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Hello! I\'m your EasyAcco AI Tax Assistant, powered by Gemini. Ask me anything about UK self-employment tax, HMRC deadlines, allowable expenses, and more.' },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function send(text?: string) {
    const msg = (text ?? input).trim()
    if (!msg || loading) return
    setInput('')
    setError('')
    const next: Message[] = [...messages, { role: 'user', content: msg }]
    setMessages(next)
    setLoading(true)

    // Build Gemini history (exclude the initial greeting and the current message)
    const history = next.slice(1, -1).map((m) => ({
      role: m.role === 'user' ? 'user' : 'model' as const,
      parts: [{ text: m.content }],
    }))

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, history }),
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error || 'API error')
      setMessages([...next, { role: 'assistant', content: data.answer || data.reply || 'Sorry, no response.' }])
    } catch (err: unknown) {
      const e = err instanceof Error ? err.message : 'Something went wrong'
      setError(e)
      setMessages(next) // remove pending user message on error? No — keep it, just show error below
    } finally {
      setLoading(false)
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  function reset() { setMessages([{ role: 'assistant', content: 'Hello! Ask me anything about UK tax and self-employment.' }]); setError('') }

  return (
    <div style={{ padding: 'clamp(1rem,3vw,2rem)', maxWidth: '760px', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 56px)' }}
      className="md:h-screen">

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <Kittax message="You’re overpaying on your next quarter payment. Let’s find the allowable costs and maximise your take-home." />
        <button onClick={reset}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(194,163,104,0.1)', border: `1px solid ${C.border}`, borderRadius: '5px', color: C.muted, fontSize: '0.78rem', padding: '7px 13px', cursor: 'pointer' }}>
          <RefreshCw size={13} /> New chat
        </button>
      </div>

      {/* Message area */}
      <div style={{ flex: 1, overflowY: 'auto', marginBottom: '1rem', paddingRight: '4px' }}>
        {messages.map((m, i) => <ChatBubble key={i} msg={m} />)}
        {loading && (
          <div style={{ display: 'flex', gap: '10px', marginBottom: '1rem' }}>
            <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'rgba(194,163,104,0.15)', border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Bot size={15} style={{ color: C.gold }} />
            </div>
            <div style={{ padding: '11px 15px', borderRadius: '14px 14px 14px 4px', background: C.card, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Loader2 size={15} style={{ color: C.gold }} className="animate-spin" />
              <span style={{ color: C.muted, fontSize: '0.85rem' }}>Thinking…</span>
            </div>
          </div>
        )}
        {error && (
          <div style={{ background: 'rgba(220,53,69,0.1)', border: '1px solid rgba(220,53,69,0.3)', borderRadius: '6px', padding: '10px 14px', color: '#ff8a9a', fontSize: '0.82rem', marginBottom: '0.75rem' }}>
            ⚠ {error}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Starter prompts */}
      {messages.length <= 1 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem', flexShrink: 0 }}>
          {STARTERS.map((s) => (
            <button key={s} onClick={() => send(s)}
              style={{ padding: '6px 13px', background: 'rgba(194,163,104,0.07)', border: `1px solid ${C.border}`, borderRadius: '999px', color: C.muted, fontSize: '0.78rem', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' }}
              onMouseEnter={(e) => { (e.currentTarget).style.borderColor = C.gold; (e.currentTarget).style.color = C.gold }}
              onMouseLeave={(e) => { (e.currentTarget).style.borderColor = C.border; (e.currentTarget).style.color = C.muted }}>
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Ask about UK tax, HMRC, expenses…   (Enter to send, Shift+Enter for new line)"
          rows={2}
          style={{ flex: 1, background: C.card, border: `1px solid ${C.border}`, borderRadius: '6px', padding: '11px 14px', color: C.text, fontSize: '0.875rem', outline: 'none', resize: 'none', lineHeight: 1.5 }}
        />
        <button onClick={() => send()} disabled={loading || !input.trim()}
          style={{ width: '46px', background: loading || !input.trim() ? 'rgba(194,163,104,0.3)' : C.gold, border: 'none', borderRadius: '6px', cursor: loading || !input.trim() ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Send size={18} style={{ color: loading || !input.trim() ? C.muted : '#0F1628' }} />
        </button>
      </div>
    </div>
  )
}
