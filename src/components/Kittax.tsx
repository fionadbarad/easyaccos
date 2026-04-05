'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, MessageSquare, Send, Loader2 } from 'lucide-react'

const C = {
  bg:     '#0B0E1A',
  card:   '#111827',
  gold:   '#FFD700',
  text:   '#E5E7EB',
  muted:  'rgba(229,231,235,0.6)',
  border: 'rgba(255,215,0,0.18)',
}

// ─── Proactive tips the cat suggests ────────────────────────────────────────
const PROACTIVE_TIPS = [
  'Claim the Use of Home flat rate (£6/wk = £312/yr) — no receipts needed.',
  'SIPP pension contributions directly reduce your taxable profit. Earn £80k? Put £30k in a pension.',
  'Your first £500 in dividends is tax-free (2026/27). Structure pay as salary + dividends.',
  'Mileage allowance: 45p per mile for the first 10,000 business miles.',
  'Training & CPD courses to maintain existing skills are 100% allowable expenses.',
  'Between £100k–£125.1k? You\'re in the 60% trap — pension contributions are the fix.',
  'Equipment for your business (laptops, phones) can be claimed 100% via Annual Investment Allowance.',
  'Marketing spend (ads, website, business cards) is fully deductible.',
]

// ─── Cat SVG Illustration ────────────────────────────────────────────────────
function CatWithBook() {
  return (
    <svg width="68" height="72" viewBox="0 0 68 72" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      {/* Body */}
      <ellipse cx="34" cy="50" rx="22" ry="18" fill="#1a2340" stroke="#FFD700" strokeWidth="1.2" />
      {/* Head */}
      <circle cx="34" cy="26" r="16" fill="#1a2340" stroke="#FFD700" strokeWidth="1.2" />
      {/* Ears */}
      <polygon points="18,14 14,4 24,10" fill="#1a2340" stroke="#FFD700" strokeWidth="1.2" />
      <polygon points="50,14 54,4 44,10" fill="#1a2340" stroke="#FFD700" strokeWidth="1.2" />
      {/* Inner ears */}
      <polygon points="18.5,13 15.5,6 23,10.5" fill="#FFD70040" />
      <polygon points="49.5,13 52.5,6 45,10.5" fill="#FFD70040" />
      {/* Eyes */}
      <ellipse cx="27" cy="24" rx="3.5" ry="4" fill="#FFD700" />
      <ellipse cx="41" cy="24" rx="3.5" ry="4" fill="#FFD700" />
      <ellipse cx="27" cy="24" rx="1.5" ry="3" fill="#0B0E1A" />
      <ellipse cx="41" cy="24" rx="1.5" ry="3" fill="#0B0E1A" />
      {/* Eye shine */}
      <circle cx="27.8" cy="22.5" r="0.8" fill="white" />
      <circle cx="41.8" cy="22.5" r="0.8" fill="white" />
      {/* Nose */}
      <polygon points="34,29 32,31.5 36,31.5" fill="#FFD700" />
      {/* Mouth */}
      <path d="M32 31.5 Q30 34 28 32.5" stroke="#FFD700" strokeWidth="0.9" fill="none" strokeLinecap="round" />
      <path d="M36 31.5 Q38 34 40 32.5" stroke="#FFD700" strokeWidth="0.9" fill="none" strokeLinecap="round" />
      {/* Whiskers */}
      <line x1="18" y1="29" x2="29" y2="30" stroke="#FFD700" strokeWidth="0.7" />
      <line x1="18" y1="31" x2="29" y2="31" stroke="#FFD700" strokeWidth="0.7" />
      <line x1="50" y1="29" x2="39" y2="30" stroke="#FFD700" strokeWidth="0.7" />
      <line x1="50" y1="31" x2="39" y2="31" stroke="#FFD700" strokeWidth="0.7" />
      {/* Arms holding book */}
      <path d="M14 52 Q10 58 14 62" stroke="#FFD700" strokeWidth="1.4" fill="none" strokeLinecap="round" />
      <path d="M54 52 Q58 58 54 62" stroke="#FFD700" strokeWidth="1.4" fill="none" strokeLinecap="round" />
      {/* Book */}
      <rect x="16" y="60" width="36" height="10" rx="2" fill="#FFD700" />
      <line x1="34" y1="60" x2="34" y2="70" stroke="#0B0E1A" strokeWidth="1" />
      <text x="20" y="68" fontSize="5.5" fill="#0B0E1A" fontFamily="sans-serif" fontWeight="bold">DO MY TAX</text>
      {/* Tail */}
      <path d="M56 62 Q65 55 60 45" stroke="#FFD700" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    </svg>
  )
}

// ─── Main Kittax Floating Mascot ─────────────────────────────────────────────
export default function Kittax() {
  const [open, setOpen]           = useState(false)
  const [tipIndex, setTipIndex]   = useState(0)
  const [input, setInput]         = useState('')
  const [reply, setReply]         = useState('')
  const [loading, setLoading]     = useState(false)
  const [pulse, setPulse]         = useState(false)

  // Rotate tip every 12 seconds
  useEffect(() => {
    const t = setInterval(() => {
      setTipIndex((i) => (i + 1) % PROACTIVE_TIPS.length)
      setPulse(true)
      setTimeout(() => setPulse(false), 1200)
    }, 12_000)
    return () => clearInterval(t)
  }, [])

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
      setReply(data.answer ?? data.error ?? 'No response.')
    } catch {
      setReply('Could not reach the AI. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 999 }}>
      <AnimatePresence>
        {open && (
          <motion.div
            key="panel"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 22, stiffness: 300 }}
            style={{
              position: 'absolute', bottom: '90px', right: 0,
              width: '300px', background: C.card,
              border: `1px solid ${C.border}`, borderRadius: '14px',
              boxShadow: `0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,215,0,0.08)`,
              overflow: 'hidden',
            }}
          >
            {/* Panel header */}
            <div style={{
              background: 'rgba(255,215,0,0.07)', borderBottom: `1px solid ${C.border}`,
              padding: '0.9rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.1rem' }}>🐱</span>
                <span style={{ color: C.gold, fontWeight: 700, fontSize: '0.88rem' }}>Kittax — Tax Advisor</span>
              </div>
              <button onClick={() => setOpen(false)}
                style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', display: 'flex', padding: '2px' }}>
                <X size={16} />
              </button>
            </div>

            {/* Proactive tip */}
            <div style={{ padding: '1rem', borderBottom: `1px solid rgba(255,215,0,0.06)` }}>
              <div style={{ color: C.muted, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '6px' }}>
                💡 Tax Tip
              </div>
              <motion.p
                key={tipIndex}
                initial={{ opacity: 0, x: 6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.35 }}
                style={{ color: C.text, fontSize: '0.82rem', lineHeight: 1.55, margin: 0 }}
              >
                {PROACTIVE_TIPS[tipIndex]}
              </motion.p>
            </div>

            {/* AI Reply */}
            {(reply || loading) && (
              <div style={{ padding: '0.85rem 1rem', borderBottom: `1px solid rgba(255,215,0,0.06)` }}>
                {loading ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '7px', color: C.muted, fontSize: '0.82rem' }}>
                    <Loader2 size={14} className="animate-spin" style={{ color: C.gold }} />
                    Thinking…
                  </div>
                ) : (
                  <p style={{ color: C.text, fontSize: '0.82rem', lineHeight: 1.55, margin: 0, whiteSpace: 'pre-wrap' }}>{reply}</p>
                )}
              </div>
            )}

            {/* Input */}
            <div style={{ padding: '0.75rem', display: 'flex', gap: '7px' }}>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && ask()}
                placeholder="Ask a tax question…"
                style={{
                  flex: 1, background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}`,
                  borderRadius: '6px', padding: '8px 11px', color: C.text, fontSize: '0.82rem',
                  outline: 'none',
                }}
              />
              <button onClick={ask} disabled={loading || !input.trim()}
                style={{
                  background: loading || !input.trim() ? 'rgba(255,215,0,0.25)' : C.gold,
                  border: 'none', borderRadius: '6px', width: '34px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: loading || !input.trim() ? 'default' : 'pointer', flexShrink: 0,
                }}>
                <Send size={14} style={{ color: '#0B0E1A' }} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating cat button */}
      <motion.button
        onClick={() => setOpen((v) => !v)}
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          background: 'transparent', border: 'none', cursor: 'pointer',
          padding: 0, display: 'block', position: 'relative',
        }}
        aria-label="Open Kittax tax advisor"
      >
        {/* Pulse ring when new tip */}
        {pulse && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0.7 }}
            animate={{ scale: 1.6, opacity: 0 }}
            transition={{ duration: 1 }}
            style={{
              position: 'absolute', inset: 0, borderRadius: '50%',
              border: `2px solid ${C.gold}`, pointerEvents: 'none',
            }}
          />
        )}
        <CatWithBook />
        {/* Badge */}
        {!open && (
          <motion.div
            initial={{ scale: 0 }} animate={{ scale: 1 }}
            style={{
              position: 'absolute', top: '-6px', right: '-6px',
              background: C.gold, borderRadius: '50%', width: '20px', height: '20px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: `0 0 10px rgba(255,215,0,0.5)`,
            }}>
            <MessageSquare size={11} style={{ color: '#0B0E1A' }} />
          </motion.div>
        )}
      </motion.button>
    </div>
  )
}
