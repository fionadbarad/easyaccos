'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, MessageSquare, Send, Loader2, Volume2, VolumeX } from 'lucide-react'

const C = {
  bg:     '#0B0E1A',
  card:   '#111827',
  gold:   '#FFD700',
  text:   '#E5E7EB',
  muted:  'rgba(229,231,235,0.6)',
  border: 'rgba(255,215,0,0.18)',
}

// ─── Scenario-aware tips with cat personality ────────────────────────────────
const PROACTIVE_TIPS = [
  { text: 'Meow! Ready to audit your 2026/27 finances? Pick your scenario above.', mood: '😺' },
  { text: 'Your first £500 in dividends is tax-free. Structure pay as salary + dividends for maximum savings.', mood: '😸' },
  { text: 'Mileage allowance: 45p per mile for the first 10,000 business miles. Keep a log!', mood: '🐱' },
  { text: 'Use of Home flat rate: £6/week = £312/year — no receipts needed. Free money!', mood: '😻' },
  { text: 'Between £100k–£125k? You are in the 60% trap — pension contributions are the escape route.', mood: '🙀' },
  { text: 'SIPP pension contributions reduce your taxable income pound-for-pound. Purr-fect for higher earners.', mood: '😸' },
  { text: 'Self Assessment deadline: 31 January 2028. Do not leave it to the last minute!', mood: '😾' },
  { text: 'Training & CPD courses to maintain existing skills are 100% allowable expenses.', mood: '😺' },
  { text: 'Equipment for your business (laptops, phones) — claim 100% via Annual Investment Allowance.', mood: '🐱' },
  { text: 'NI Class 4: 6% on profits £12,570–£50,270, then 2% above. I never forget the numbers.', mood: '😸' },
  { text: 'ISA allowance: £20,000 per year. All returns completely tax-free. Even I am jealous.', mood: '😻' },
  { text: 'MTD for Income Tax starts April 2026 for income above £50k. Get your digital records ready!', mood: '🐱' },
]

// ─── Scenario greetings by employment type ──────────────────────────────────
export const SCENARIO_MESSAGES: Record<string, string> = {
  employed:
    '😺 As a PAYE employee, your employer handles your tax — but you may be owed a refund if you stopped work mid-year!',
  'self-employed':
    '🐱 Self-employed? NI Class 4 is 6% on your profit. Keep every allowable expense receipt — I will make sure nothing is missed!',
  high_earner:
    '🙀 You are in the 60% trap! Every £2 you earn over £100k loses £1 of your Personal Allowance. A pension contribution is your best friend right now.',
  welfare:
    '😺 Universal Credit is 100% tax-free — it will not touch your £12,570 allowance. JSA and Carer\'s Allowance are taxable though.',
  redundancy:
    '😸 I have applied your £30k redundancy exemption. You are keeping every penny you are entitled to. Check if you are owed a PAYE refund!',
  director:
    '😻 Smart move! Taking dividends means you avoid NI on your top earnings. £12,570 salary + dividends = the optimal structure.',
}

type Expr = 'idle' | 'happy' | 'thinking'

// ─── Cat SVG ────────────────────────────────────────────────────────────────
function CatSVG({ expr }: { expr: Expr }) {
  const body = '#111111'
  const eye  = '#FFD700'
  return (
    <svg width="80" height="88" viewBox="0 0 80 88" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <ellipse cx="40" cy="84" rx="22" ry="3.5" fill="rgba(0,0,0,0.22)" />
      <path d="M59 64 Q72 55 67 42" stroke="#1a1a1a" strokeWidth="6" fill="none" strokeLinecap="round" />
      <path d="M59 64 Q72 55 67 42" stroke={body} strokeWidth="4.5" fill="none" strokeLinecap="round" />
      <ellipse cx="40" cy="59" rx="22" ry="19" fill={body} />
      <circle cx="40" cy="28" r="23" fill={body} />
      <polygon points="20,15 14,1 29,8" fill={body} />
      <polygon points="20.5,14 17,5 27,9" fill="#2a0e30" />
      <polygon points="60,15 66,1 51,8" fill={body} />
      <polygon points="59.5,14 63,5 53,9" fill="#2a0e30" />

      {expr === 'idle' && (
        <>
          <ellipse cx="29" cy="27" rx="7" ry="8" fill={eye} />
          <ellipse cx="51" cy="27" rx="7" ry="8" fill={eye} />
          <ellipse cx="29" cy="28" rx="3" ry="6" fill="#080808" />
          <ellipse cx="51" cy="28" rx="3" ry="6" fill="#080808" />
          <circle cx="32" cy="23.5" r="2" fill="white" opacity="0.9" />
          <circle cx="54" cy="23.5" r="2" fill="white" opacity="0.9" />
        </>
      )}
      {expr === 'happy' && (
        <>
          <path d="M22 26 Q29 19 36 26" stroke={eye} strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M44 26 Q51 19 58 26" stroke={eye} strokeWidth="3" fill="none" strokeLinecap="round" />
          <ellipse cx="21" cy="35" rx="5.5" ry="3" fill="rgba(255,150,150,0.3)" />
          <ellipse cx="59" cy="35" rx="5.5" ry="3" fill="rgba(255,150,150,0.3)" />
        </>
      )}
      {expr === 'thinking' && (
        <>
          <ellipse cx="29" cy="27" rx="7" ry="8" fill={eye} />
          <ellipse cx="29" cy="28" rx="3" ry="6" fill="#080808" />
          <circle cx="32" cy="23.5" r="2" fill="white" opacity="0.9" />
          <ellipse cx="51" cy="28" rx="7" ry="4" fill={eye} />
          <ellipse cx="51" cy="28.5" rx="2.8" ry="2.8" fill="#080808" />
          <circle cx="53.5" cy="26" r="1.4" fill="white" opacity="0.9" />
          <circle cx="62" cy="14" r="1.8" fill={eye} opacity="0.7" />
          <circle cx="66" cy="9" r="2.5" fill={eye} opacity="0.7" />
          <circle cx="71" cy="4" r="3.2" fill={eye} opacity="0.7" />
        </>
      )}

      <polygon points="40,35 37.5,38 42.5,38" fill="#ffb5c8" />
      {expr === 'happy' ? (
        <path d="M31 38.5 Q40 46 49 38.5" stroke="#999" strokeWidth="1.3" fill="none" strokeLinecap="round" />
      ) : (
        <>
          <path d="M37.5 38 Q35 41.5 31.5 40" stroke="#777" strokeWidth="1.1" fill="none" strokeLinecap="round" />
          <path d="M42.5 38 Q45 41.5 48.5 40" stroke="#777" strokeWidth="1.1" fill="none" strokeLinecap="round" />
        </>
      )}

      <line x1="6"  y1="33" x2="27" y2="35.5" stroke="white" strokeWidth="1"   opacity="0.85" />
      <line x1="6"  y1="37" x2="27" y2="37"   stroke="white" strokeWidth="1"   opacity="0.85" />
      <line x1="6"  y1="41" x2="27" y2="39"   stroke="white" strokeWidth="0.9" opacity="0.7"  />
      <line x1="74" y1="33" x2="53" y2="35.5" stroke="white" strokeWidth="1"   opacity="0.85" />
      <line x1="74" y1="37" x2="53" y2="37"   stroke="white" strokeWidth="1"   opacity="0.85" />
      <line x1="74" y1="41" x2="53" y2="39"   stroke="white" strokeWidth="0.9" opacity="0.7"  />

      <ellipse cx="27" cy="74" rx="8" ry="5" fill={body} />
      <ellipse cx="53" cy="74" rx="8" ry="5" fill={body} />
      <rect x="15" y="71" width="50" height="14" rx="3" fill="#FFD700" />
      <rect x="15" y="71" width="50" height="14" rx="3" stroke="#c9920a" strokeWidth="0.8" />
      <line x1="40" y1="71" x2="40" y2="85" stroke="#b8850a" strokeWidth="1.5" />
      <text x="18.5" y="81" fontSize="5.4" fill="#0d0d0d" fontFamily="sans-serif" fontWeight="bold">DO MY TAX</text>
    </svg>
  )
}

// ─── Mini cat face for chat messages ────────────────────────────────────────
function MiniCat() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style={{ flexShrink: 0 }}>
      <circle cx="14" cy="15" r="10" fill="#111111" />
      <polygon points="6,8 4,1 9,5" fill="#111111" />
      <polygon points="22,8 24,1 19,5" fill="#111111" />
      <polygon points="6.5,7 5.5,3 8.5,5.5" fill="#2a0e30" />
      <polygon points="21.5,7 22.5,3 19.5,5.5" fill="#2a0e30" />
      <ellipse cx="10" cy="13" rx="2.5" ry="3" fill="#FFD700" />
      <ellipse cx="18" cy="13" rx="2.5" ry="3" fill="#FFD700" />
      <ellipse cx="10" cy="13.5" rx="1.2" ry="2.2" fill="#080808" />
      <ellipse cx="18" cy="13.5" rx="1.2" ry="2.2" fill="#080808" />
      <circle cx="11.5" cy="11.5" r="0.8" fill="white" opacity="0.9" />
      <circle cx="19.5" cy="11.5" r="0.8" fill="white" opacity="0.9" />
      <polygon points="14,17 13,18.5 15,18.5" fill="#ffb5c8" />
      <path d="M13 18.5 Q12 20 10.5 19.5" stroke="#777" strokeWidth="0.7" fill="none" strokeLinecap="round" />
      <path d="M15 18.5 Q16 20 17.5 19.5" stroke="#777" strokeWidth="0.7" fill="none" strokeLinecap="round" />
    </svg>
  )
}

// ─── Voice helper ───────────────────────────────────────────────────────────
function speak(text: string, onEnd?: () => void) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
  window.speechSynthesis.cancel()
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text]
  sentences.forEach((s, i) => {
    const utt = new SpeechSynthesisUtterance(s.trim())
    const voices = window.speechSynthesis.getVoices()
    utt.voice = voices.find(v =>
      v.name.includes('Google UK English Female') || v.lang === 'en-GB'
    ) || null
    utt.rate = 0.95; utt.pitch = 1.1
    if (i === sentences.length - 1 && onEnd) utt.onend = onEnd
    window.speechSynthesis.speak(utt)
  })
}

// ─── Main Kittax Component ─────────────────────────────────────────────────
export default function Kittax() {
  const [open, setOpen]         = useState(false)
  const [tipIndex, setTipIndex] = useState(0)
  const [input, setInput]       = useState('')
  const [messages, setMessages] = useState<{ from: 'cat' | 'user'; text: string }[]>([])
  const [loading, setLoading]   = useState(false)
  const [pulse, setPulse]       = useState(false)
  const [voiceOn, setVoiceOn]   = useState(false)
  const [speaking, setSpeaking] = useState(false)

  const tip = PROACTIVE_TIPS[tipIndex]
  const expr: Expr = tipIndex % 3 === 1 ? 'happy' : tipIndex % 3 === 2 ? 'thinking' : 'idle'

  useEffect(() => {
    const t = setInterval(() => {
      setTipIndex((i) => (i + 1) % PROACTIVE_TIPS.length)
      setPulse(true)
      setTimeout(() => setPulse(false), 1400)
    }, 12_000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (voiceOn && open) {
      setSpeaking(true)
      speak(tip.text, () => setSpeaking(false))
    }
  }, [tipIndex, voiceOn, open, tip.text])

  async function ask() {
    const q = input.trim()
    if (!q || loading) return
    setInput('')
    setMessages(prev => [...prev, { from: 'user', text: q }])
    setLoading(true)
    try {
      const res  = await fetch('/api/ai/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ message: q }),
      })
      const data = await res.json()
      const answer = data.answer ?? data.error ?? 'No response.'
      setMessages(prev => [...prev, { from: 'cat', text: answer }])
      if (voiceOn) {
        setSpeaking(true)
        speak(answer, () => setSpeaking(false))
      }
    } catch {
      setMessages(prev => [...prev, { from: 'cat', text: 'Could not process that. Please try again!' }])
    } finally {
      setLoading(false)
    }
  }

  function toggleVoice() {
    if (voiceOn) {
      window.speechSynthesis?.cancel()
      setSpeaking(false)
    }
    setVoiceOn((v) => !v)
  }

  return (
    <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 999 }}>
      <AnimatePresence>
        {open && (
          <motion.div
            key="panel"
            initial={{ opacity: 0, y: 20, scale: 0.93 }}
            animate={{ opacity: 1, y: 0,  scale: 1 }}
            exit={  { opacity: 0, y: 20,  scale: 0.93 }}
            transition={{ type: 'spring', damping: 22, stiffness: 300 }}
            style={{
              position: 'absolute', bottom: '100px', right: 0,
              width: '340px', background: C.card,
              border: `1px solid ${C.border}`, borderRadius: '16px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,215,0,0.07)',
              overflow: 'hidden', backdropFilter: 'blur(10px)',
              display: 'flex', flexDirection: 'column', maxHeight: '520px',
            }}
          >
            {/* Header with cat branding */}
            <div style={{
              background: 'rgba(255,215,0,0.08)', borderBottom: `1px solid ${C.border}`,
              padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MiniCat />
                <div>
                  <div style={{ color: C.gold, fontWeight: 700, fontSize: '0.86rem' }}>Kittax 🐱</div>
                  <div style={{ color: C.muted, fontSize: '0.65rem' }}>UK Tax Advisor 2026/27 — Always Free</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button onClick={toggleVoice} title={voiceOn ? 'Mute Kittax' : 'Enable voice'}
                  style={{ background: voiceOn ? 'rgba(255,215,0,0.15)' : 'none', border: voiceOn ? `1px solid rgba(255,215,0,0.3)` : 'none', borderRadius: '6px', color: voiceOn ? C.gold : C.muted, cursor: 'pointer', padding: '4px 6px', display: 'flex', alignItems: 'center' }}>
                  {voiceOn ? <Volume2 size={14} /> : <VolumeX size={14} />}
                </button>
                <button onClick={() => setOpen(false)}
                  style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', padding: '2px', display: 'flex' }}>
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Rotating tax tip with cat mood */}
            <div style={{ padding: '0.75rem 1rem', borderBottom: `1px solid rgba(255,215,0,0.06)`, background: 'rgba(255,215,0,0.03)' }}>
              <div style={{ color: C.muted, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                {tip.mood} Tax Tip
                {speaking && <span style={{ color: C.gold, fontSize: '0.62rem', animation: 'pulse 1s infinite' }}>● speaking</span>}
              </div>
              <motion.p
                key={tipIndex}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
                style={{ color: C.text, fontSize: '0.8rem', lineHeight: 1.55, margin: 0 }}
              >
                {tip.text}
              </motion.p>
            </div>

            {/* Chat messages area */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '0.6rem 0.75rem', minHeight: '120px', maxHeight: '260px' }}>
              {messages.length === 0 && (
                <div style={{ textAlign: 'center', padding: '1.2rem 0.5rem' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🐱</div>
                  <p style={{ color: C.muted, fontSize: '0.78rem', lineHeight: 1.5, margin: 0 }}>
                    Ask me anything about UK tax!<br />
                    Or just type your income for an instant breakdown.
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', justifyContent: 'center', marginTop: '0.6rem' }}>
                    {['Tax on £40k?', 'Expenses', 'Dividends', 'NI rates'].map(q => (
                      <button key={q} onClick={() => { setInput(q); }}
                        style={{ padding: '4px 10px', background: 'rgba(255,215,0,0.06)', border: `1px solid ${C.border}`, borderRadius: '999px', color: C.muted, fontSize: '0.7rem', cursor: 'pointer' }}>
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map((msg, i) => (
                <div key={i} style={{ display: 'flex', gap: '7px', marginBottom: '0.6rem', justifyContent: msg.from === 'user' ? 'flex-end' : 'flex-start' }}>
                  {msg.from === 'cat' && <MiniCat />}
                  <div style={{
                    maxWidth: '82%',
                    padding: '8px 12px',
                    borderRadius: msg.from === 'user' ? '12px 12px 3px 12px' : '12px 12px 12px 3px',
                    background: msg.from === 'user' ? 'rgba(255,215,0,0.1)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${msg.from === 'user' ? 'rgba(255,215,0,0.25)' : C.border}`,
                    color: C.text, fontSize: '0.8rem', lineHeight: 1.55, whiteSpace: 'pre-wrap',
                  }}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {loading && (
                <div style={{ display: 'flex', gap: '7px', marginBottom: '0.6rem' }}>
                  <MiniCat />
                  <div style={{ padding: '8px 12px', borderRadius: '12px 12px 12px 3px', background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Loader2 size={13} className="animate-spin" style={{ color: C.gold }} />
                    <span style={{ color: C.muted, fontSize: '0.78rem' }}>Thinking...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div style={{ padding: '0.6rem', borderTop: `1px solid rgba(255,215,0,0.06)`, display: 'flex', gap: '7px' }}>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && ask()}
                placeholder="Ask a tax question..."
                style={{
                  flex: 1, background: 'rgba(255,255,255,0.04)',
                  border: `1px solid ${C.border}`, borderRadius: '7px',
                  padding: '8px 11px', color: C.text, fontSize: '0.82rem', outline: 'none',
                  minHeight: '40px',
                }}
              />
              <button onClick={ask} disabled={loading || !input.trim()}
                style={{
                  background: loading || !input.trim() ? 'rgba(255,215,0,0.22)' : C.gold,
                  border: 'none', borderRadius: '7px', width: '40px', minHeight: '40px', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: loading || !input.trim() ? 'default' : 'pointer',
                }}>
                <Send size={14} style={{ color: '#0B0E1A' }} />
              </button>
            </div>

            <div style={{ padding: '0 0.7rem 0.5rem', textAlign: 'center' }}>
              <span style={{ color: C.muted, fontSize: '0.58rem' }}>Powered by Kittax Brain 🐱 | 2026/27 HMRC Compliant | No External AI</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating cat */}
      <motion.button
        onClick={() => setOpen((v) => !v)}
        animate={{ y: [0, -9, 0] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
        style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, display: 'block', position: 'relative' }}
        aria-label="Open Kittax tax advisor"
        whileHover={{ scale: 1.07 }}
        whileTap={{ scale: 0.95 }}
      >
        {pulse && (
          <motion.div
            initial={{ scale: 0.85, opacity: 0.7 }}
            animate={{ scale: 1.7,  opacity: 0 }}
            transition={{ duration: 1.1 }}
            style={{ position: 'absolute', inset: '-4px', borderRadius: '50%', border: `2px solid ${C.gold}`, pointerEvents: 'none' }}
          />
        )}
        <motion.div
          animate={{ scaleX: [1, 1.04, 1], scaleY: [1, 0.96, 1] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <CatSVG expr={open ? 'happy' : expr} />
        </motion.div>

        {!open && (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
            style={{
              position: 'absolute', top: '-4px', right: '-4px',
              background: C.gold, borderRadius: '50%', width: '22px', height: '22px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 12px rgba(255,215,0,0.55)',
            }}>
            <MessageSquare size={11} style={{ color: '#0B0E1A' }} />
          </motion.div>
        )}
      </motion.button>
    </div>
  )
}
