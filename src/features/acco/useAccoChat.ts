'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { useUserData } from '@/lib/use-user-data'
import { buildBaseContext } from '@/lib/acco/context'
import type { AccoContext, AccoMessage } from '@/lib/acco/types'

const FETCH_TIMEOUT = 30_000

export function makeMessage(
  role: AccoMessage['role'],
  content: string,
  offline = false,
): AccoMessage {
  return { id: crypto.randomUUID(), role, content, ts: Date.now(), offline }
}

function greetingByHour(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

// Minimal shape of a stored expense — only the fields context injection needs.
interface ExpenseStub {
  id: string
  amount: number
  date: string
}

export interface AccoChat {
  messages: AccoMessage[]
  input: string
  setInput: (v: string) => void
  loading: boolean
  error: string
  send: (text?: string) => Promise<void>
  reset: () => void
  ctxSummary: string | undefined
  showSuggested: boolean
  canSend: boolean
  lastAssistantId: string | null
  bottomRef: React.RefObject<HTMLDivElement | null>
}

export function useAccoChat(): AccoChat {
  const initialMessage = useMemo(
    () =>
      makeMessage(
        'assistant',
        `${greetingByHour()} — I'm your personal tax advisor, aligned to HMRC rules for the 2026/27 fiscal year.\n\nI can walk through sole-trader income, director pay, dividends, MTD deadlines, allowable expenses, National Insurance, the 60% trap — whatever's on your mind. Tell me roughly what you earn and where the friction is, and I'll take it from there.\n\nWhat shall we look at first?`,
      ),
    [],
  )

  const [messages, setMessages] = useState<AccoMessage[]>([initialMessage])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const bottomRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Load user's expenses for context injection
  const { items: expenses } = useUserData<ExpenseStub>('user_expenses', 'easyacco_expenses', [])

  const taxContext: Partial<AccoContext> = useMemo(() => {
    const base = buildBaseContext()
    // Sum expenses from the current tax year (6 Apr – 5 Apr)
    const now = new Date()
    const taxYearStart =
      now.getMonth() >= 3 // April = 3
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
    const next = [...messages, userMsg]
    setMessages(next)
    setLoading(true)

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT)

    const history = next.slice(1, -1).map((m) => ({
      role: m.role === 'user' ? 'user' : ('model' as const),
      parts: [{ text: m.content }],
    }))

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, history, context: taxContext }),
        signal: controller.signal,
      })

      const isStreaming = res.headers.get('X-Streaming') === 'true'

      if (isStreaming && res.body) {
        // Real streaming — read chunks and update the last message progressively
        const reader = res.body.getReader()
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
        // JSON fallback — server is in offline mode (no GEMINI_API_KEY) or the
        // upstream call failed and the route degraded to a canned reply.
        const data = await res.json()
        if (!res.ok || data.error) throw new Error(data.error || 'No response from server.')
        const isOffline = data.offline === true
        setMessages([
          ...next,
          makeMessage('assistant', data.answer || data.reply || 'No response.', isOffline),
        ])
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

  function reset() {
    abortRef.current?.abort()
    setMessages([makeMessage('assistant', 'Session cleared. What do you need to work through?')])
    setError('')
    setLoading(false)
  }

  const showSuggested = messages.length <= 1
  const canSend = !loading && input.trim().length > 0
  const lastAssistantIdx = [...messages].reverse().findIndex((m) => m.role === 'assistant')
  const lastAssistantId =
    lastAssistantIdx >= 0 ? messages[messages.length - 1 - lastAssistantIdx]!.id : null

  const ctxSummary =
    taxContext.totalExpensesYTD != null
      ? `£${taxContext.totalExpensesYTD.toLocaleString('en-GB', { minimumFractionDigits: 2 })} expenses YTD · ${taxContext.currentMonth}`
      : taxContext.currentMonth

  return {
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
  }
}
