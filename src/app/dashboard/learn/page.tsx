'use client'

import { useState } from 'react'
import cards from '@/content/learning-cards.json'
import { ChevronLeft, ChevronRight, BookOpen, X } from 'lucide-react'

const C = { bg: '#181818', deep: '#222326', card: '#1C1D20', white: '#F4F5F8', text: '#F4F5F8', muted: 'rgba(244,245,248,0.42)', border: 'rgba(244,245,248,0.07)' }

const CATEGORIES = ['All', ...Array.from(new Set((cards as Card[]).map((c) => c.category)))]

interface Card { id: string; title: string; summary: string; deepDive: string; category: string; icon: string }

export default function LearnPage() {
  const [category, setCategory] = useState('All')
  const [idx, setIdx] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [expanded, setExpanded] = useState<Card | null>(null)

  const filtered = (cards as Card[]).filter((c) => category === 'All' || c.category === category)
  const card = filtered[idx] ?? null
  const progress = filtered.length > 0 ? ((idx + 1) / filtered.length * 100) : 0

  function prev() { setIdx((i) => Math.max(0, i - 1)); setFlipped(false) }
  function next() { setIdx((i) => Math.min(filtered.length - 1, i + 1)); setFlipped(false) }

  function changeCategory(cat: string) {
    setCategory(cat)
    setIdx(0)
    setFlipped(false)
  }

  return (
    <div style={{ padding: 'clamp(1.5rem,4vw,2.5rem)', maxWidth: '760px' }}>
      <h1 style={{ color: C.text, fontSize: 'clamp(1.5rem,3vw,2rem)', fontWeight: 700, marginBottom: '0.3rem' }}>
        Learn
      </h1>
      <p style={{ color: C.muted, fontSize: '0.875rem', marginBottom: '2rem' }}>
        UK tax literacy cards · {filtered.length} cards · Tap a card to reveal the deep dive
      </p>

      {/* Category filter */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '2rem' }}>
        {CATEGORIES.map((cat) => (
          <button key={cat} onClick={() => changeCategory(cat)}
            style={{ padding: '6px 16px', borderRadius: '999px', border: `1px solid ${category === cat ? C.white : C.border}`, background: category === cat ? 'rgba(244,245,248,0.08)' : 'transparent', color: category === cat ? C.white : C.muted, cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, transition: 'all 0.15s' }}>
            {cat}
          </button>
        ))}
      </div>

      {card ? (
        <>
          {/* Progress bar */}
          <div style={{ marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
              <span style={{ color: C.muted, fontSize: '0.78rem' }}>{idx + 1} of {filtered.length}</span>
              <span style={{ color: C.muted, fontSize: '0.78rem' }}>{Math.round(progress)}%</span>
            </div>
            <div style={{ height: '4px', background: 'rgba(255,255,255,0.07)', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${progress}%`, background: C.white, borderRadius: '2px', transition: 'width 0.3s ease' }} />
            </div>
          </div>

          {/* Flashcard */}
          <div onClick={() => setFlipped((f) => !f)}
            style={{
              background: C.card, border: `1px solid ${flipped ? 'rgba(244,245,248,0.3)' : C.border}`,
              borderRadius: '10px', padding: '2.5rem 2rem',
              minHeight: '220px', cursor: 'pointer',
              transition: 'border-color 0.2s',
              marginBottom: '1.25rem',
              display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
            }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
                <span style={{ padding: '3px 10px', background: 'rgba(244,245,248,0.05)', border: `1px solid ${C.border}`, borderRadius: '999px', color: C.muted, fontSize: '0.7rem', letterSpacing: '0.08em' }}>
                  {card.category}
                </span>
              </div>
              <h2 style={{ color: C.text, fontSize: '1.35rem', fontWeight: 700, marginBottom: '1rem' }}>
                {card.title}
              </h2>
              <p style={{ color: flipped ? C.muted : C.text, fontSize: '0.9rem', lineHeight: 1.7, transition: 'color 0.2s' }}>
                {flipped ? card.deepDive : card.summary}
              </p>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem' }}>
              <span style={{ color: C.muted, fontSize: '0.72rem' }}>{flipped ? 'Tap to see summary' : 'Tap for deep dive →'}</span>
              <button onClick={(e) => { e.stopPropagation(); setExpanded(card) }}
                style={{ display: 'flex', alignItems: 'center', gap: '5px', color: C.muted, background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 500 }}>
                <BookOpen size={13} /> Full Article
              </button>
            </div>
          </div>

          {/* Navigation */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
            <button onClick={prev} disabled={idx === 0}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 20px', background: idx === 0 ? 'transparent' : 'rgba(244,245,248,0.06)', border: `1px solid ${idx === 0 ? C.border : C.white}`, borderRadius: '5px', color: idx === 0 ? C.muted : C.white, cursor: idx === 0 ? 'default' : 'pointer', fontSize: '0.875rem', fontWeight: 600 }}>
              <ChevronLeft size={16} /> Previous
            </button>
            <button onClick={next} disabled={idx === filtered.length - 1}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 20px', background: idx === filtered.length - 1 ? 'transparent' : C.white, border: `1px solid ${idx === filtered.length - 1 ? C.border : C.white}`, borderRadius: '5px', color: idx === filtered.length - 1 ? C.muted : '#181818', cursor: idx === filtered.length - 1 ? 'default' : 'pointer', fontSize: '0.875rem', fontWeight: 700 }}>
              Next <ChevronRight size={16} />
            </button>
          </div>
        </>
      ) : (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '8px', padding: '3rem', textAlign: 'center', color: C.muted }}>
          No cards in this category.
        </div>
      )}

      {/* Full article modal */}
      {expanded && (
        <div onClick={() => setExpanded(null)}
          style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
          <div onClick={(e) => e.stopPropagation()}
            style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '10px', padding: '2rem', maxWidth: '600px', width: '100%', maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
              <span style={{ padding: '3px 10px', background: 'rgba(244,245,248,0.05)', border: `1px solid ${C.border}`, borderRadius: '999px', color: C.muted, fontSize: '0.7rem' }}>{expanded.category}</span>
              <button onClick={() => setExpanded(null)} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', padding: '2px', display: 'flex' }}><X size={18} /></button>
            </div>
            <h2 style={{ color: C.text, fontSize: '1.4rem', fontWeight: 700, marginBottom: '1rem' }}>{expanded.title}</h2>
            <p style={{ color: C.muted, fontSize: '0.9rem', lineHeight: 1.75 }}>{expanded.deepDive}</p>
          </div>
        </div>
      )}
    </div>
  )
}
