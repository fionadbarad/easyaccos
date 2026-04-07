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

// ─── Scenario-aware tips ─────────────────────────────────────────────────────
const PROACTIVE_TIPS = [
  'Meow! Ready to audit your 2026/27 finances? Pick your scenario above.',
  'Brilliant move! By taking dividends, you\'re avoiding the 8% NI on your top earnings.',
  'I\'ve applied your £30k redundancy exemption. You\'re keeping every penny you\'re entitled to.',
  'Universal Credit is tax-free! It won\'t touch your £12,570 allowance.',
  'Between £100k–£125.1k? You\'re in the 60% trap — pension contributions are the fix.',
  'SIPP pension contributions directly reduce your taxable profit. Earn £80k? Put £30k in a pension.',
  'Your first £500 in dividends is tax-free (2026/27). Structure pay as salary + dividends.',
  'Mileage allowance: 45p per mile for the first 10,000 business miles.',
  'Training & CPD courses to maintain existing skills are 100% allowable expenses.',
  'Equipment for your business (laptops, phones) can be claimed 100% via Annual Investment Allowance.',
  'Claim the Use of Home flat rate (£6/wk = £312/yr) — no receipts needed.',
]

// ─── Scenario greetings by employment type ───────────────────────────────────
export const SCENARIO_MESSAGES: Record<string, string> = {
  employed:
    'Meow! As a PAYE employee, your employer handles your tax — but you may be owed a refund if you stopped work mid-year!',
  'self-employed':
    'Meow! Self-employed? Don\'t forget — NI Class 4 is 6% on your profit. Keep every allowable expense receipt!',
  high_earner:
    '⚠️ You\'re in the 60% trap! Every £2 you earn over £100k loses £1 of your Personal Allowance. A pension contribution is your best friend right now.',
  welfare:
    'Universal Credit is 100% tax-free — it won\'t touch your £12,570 allowance. JSA and Carer\'s Allowance are taxable though.',
  redundancy:
    'I\'ve applied your £30k redundancy exemption. You\'re keeping every penny you\'re entitled to. Check if you\'re owed a PAYE refund!',
  director:
    'Brilliant move! By taking dividends, you\'re avoiding the 8% NI on your top earnings. £12,570 salary + dividends = optimal structure.',
}

type Expr = 'idle' | 'happy' | 'thinking'

// ─── Cat SVG ─────────────────────────────────────────────────────────────────
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

// ─── Voice helper ─────────────────────────────────────────────────────────────
function speak(text: string, onEnd?: () => void) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
  window.speechSynthesis.cancel()
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text]
  sentences.forEach((s, i) => {
    const utt = new SpeechSynthesisUtterance(s.trim())
    // Target Southern English (RP)
    const voices = window.speechSynthesis.getVoices()
    utt.voice = voices.find(v =>
      v.name.includes('Google UK English Female') || v.lang === 'en-GB'
    ) || null
    utt.rate = 0.95; utt.pitch = 1.1
    if (i === sentences.length - 1 && onEnd) utt.onend = onEnd
    window.speechSynthesis.speak(utt)
  })
}

// ─── Main Kittax Component ────────────────────────────────────────────────────
export default function Kittax() {
  const [open, setOpen]         = useState(false)
  const [tipIndex, setTipIndex] = useState(0)
  const [input, setInput]       = useState('')
  const [reply, setReply]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [pulse, setPulse]       = useState(false)
  const [voiceOn, setVoiceOn]   = useState(false)
  const [speaking, setSpeaking] = useState(false)

  const expr: Expr = tipIndex % 3 === 1 ? 'happy' : tipIndex % 3 === 2 ? 'thinking' : 'idle'

  useEffect(() => {
    const t = setInterval(() => {
      setTipIndex((i) => (i + 1) % PROACTIVE_TIPS.length)
      setPulse(true)
      setTimeout(() => setPulse(false), 1400)
    }, 12_000)
    return () => clearInterval(t)
  }, [])

  // Auto-speak tip if voice is on
  useEffect(() => {
    if (voiceOn && open) {
      setSpeaking(true)
      speak(PROACTIVE_TIPS[tipIndex], () => setSpeaking(false))
    }
  }, [tipIndex, voiceOn, open])

  async function ask() {
    const q = input.trim()
    if (!q || loading) return
    setInput('')
    setLoading(true)
    setReply('')
    try {
      const res  = await fetch('/api/ai/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ message: q }),
      })
      const data = await res.json()
      const answer = data.answer ?? data.error ?? 'No response.'
      setReply(answer)
      if (voiceOn) {
        setSpeaking(true)
        speak(answer, () => setSpeaking(false))
      }
    } catch {
      setReply('Could not reach the AI. Please try again.')
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
              width: '320px', background: C.card,
              border: `1px solid ${C.border}`, borderRadius: '16px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,215,0,0.07)',
              overflow: 'hidden', backdropFilter: 'blur(10px)',
            }}
          >
            {/* Header */}
            <div style={{
              background: 'rgba(255,215,0,0.08)', borderBottom: `1px solid ${C.border}`,
              padding: '0.85rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.1rem' }}>🐱</span>
                <div>
                  <div style={{ color: C.gold, fontWeight: 700, fontSize: '0.86rem' }}>Kittax</div>
                  <div style={{ color: C.muted, fontSize: '0.68rem' }}>UK Tax Advisor 2026/27</div>
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

            {/* Tip */}
            <div style={{ padding: '0.9rem 1rem', borderBottom: `1px solid rgba(255,215,0,0.06)` }}>
              <div style={{ color: C.muted, fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '5px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                Tax Tip
                {speaking && <span style={{ color: C.gold, fontSize: '0.65rem', animation: 'pulse 1s infinite' }}>● speaking</span>}
              </div>
              <motion.p
                key={tipIndex}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
                style={{ color: C.text, fontSize: '0.82rem', lineHeight: 1.6, margin: 0 }}
              >
                {PROACTIVE_TIPS[tipIndex]}
              </motion.p>
            </div>

            {/* Reply */}
            {(reply || loading) && (
              <div style={{ padding: '0.8rem 1rem', borderBottom: `1px solid rgba(255,215,0,0.06)`, maxHeight: '160px', overflowY: 'auto' }}>
                {loading ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '7px', color: C.muted, fontSize: '0.82rem' }}>
                    <Loader2 size={14} className="animate-spin" style={{ color: C.gold }} />
                    Thinking...
                  </div>
                ) : (
                  <p style={{ color: C.text, fontSize: '0.82rem', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' }}>{reply}</p>
                )}
              </div>
            )}

            {/* Input */}
            <div style={{ padding: '0.7rem', display: 'flex', gap: '7px' }}>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && ask()}
                placeholder="Ask a tax question..."
                style={{
                  flex: 1, background: 'rgba(255,255,255,0.04)',
                  border: `1px solid ${C.border}`, borderRadius: '7px',
                  padding: '8px 11px', color: C.text, fontSize: '0.82rem', outline: 'none',
                  minHeight: '44px',
                }}
              />
              <button onClick={ask} disabled={loading || !input.trim()}
                style={{
                  background: loading || !input.trim() ? 'rgba(255,215,0,0.22)' : C.gold,
                  border: 'none', borderRadius: '7px', width: '44px', minHeight: '44px', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: loading || !input.trim() ? 'default' : 'pointer',
                }}>
                <Send size={14} style={{ color: '#0B0E1A' }} />
              </button>
            </div>

            <div style={{ padding: '0 0.7rem 0.6rem', textAlign: 'center' }}>
              <span style={{ color: C.muted, fontSize: '0.62rem' }}>2026/27 HMRC Compliant | Encrypted via Supabase</span>
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
