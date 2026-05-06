'use client'

import { useState } from 'react'
import cards from '@/content/learning-cards.json'
import { ChevronLeft, ChevronRight, BookOpen, X } from 'lucide-react'

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
    <div className="p-[clamp(1.5rem,4vw,2.5rem)] max-w-[760px]">
      <h1 className="text-[var(--sa-white)] text-[clamp(1.5rem,3vw,2rem)] font-bold mb-[0.3rem]">
        Learn
      </h1>
      <p className="text-[rgba(244,245,248,0.42)] text-[0.875rem] mb-[2rem]">
        UK tax literacy cards · {filtered.length} cards · Tap a card to reveal the deep dive
      </p>

      {/* Category filter */}
      <div className="flex flex-wrap gap-[0.5rem] mb-[2rem]">
        {CATEGORIES.map((cat) => (
          <button key={cat} onClick={() => changeCategory(cat)}
            className={`p-[6px_16px] rounded-[999px] cursor-pointer text-[0.8rem] font-semibold transition-all duration-150 ease-in-out ${category === cat ? 'border border-[var(--sa-white)] bg-[rgba(244,245,248,0.08)] text-[var(--sa-white)]' : 'border border-[var(--sa-border)] bg-transparent text-[rgba(244,245,248,0.42)]'}`}>
            {cat}
          </button>
        ))}
      </div>

      {card ? (
        <>
          {/* Progress bar */}
          <div className="mb-[1.25rem]">
            <div className="flex justify-between mb-[5px]">
              <span className="text-[rgba(244,245,248,0.42)] text-[0.78rem]">{idx + 1} of {filtered.length}</span>
              <span className="text-[rgba(244,245,248,0.42)] text-[0.78rem]">{Math.round(progress)}%</span>
            </div>
            <div className="h-[4px] bg-[rgba(255,255,255,0.07)] rounded-[2px] overflow-hidden">
              <div className="h-full bg-[var(--sa-white)] rounded-[2px] transition-[width] duration-300 ease-in-out" style={{ width: `${progress}%` }} />
            </div>
          </div>

          {/* Flashcard */}
          <div onClick={() => setFlipped((f) => !f)}
            className={`bg-[var(--sa-surface)] rounded-[10px] p-[2.5rem_2rem] min-h-[220px] cursor-pointer transition-[border-color] duration-200 mb-[1.25rem] flex flex-col justify-between ${flipped ? 'border border-[rgba(244,245,248,0.3)]' : 'border border-[var(--sa-border)]'}`}>
            <div>
              <div className="flex items-center gap-[8px] mb-[1rem]">
                <span className="p-[3px_10px] bg-[rgba(244,245,248,0.05)] border border-[var(--sa-border)] rounded-[999px] text-[rgba(244,245,248,0.42)] text-[0.7rem] tracking-[0.08em]">
                  {card.category}
                </span>
              </div>
              <h2 className="text-[var(--sa-white)] text-[1.35rem] font-bold mb-[1rem]">
                {card.title}
              </h2>
              <p className={`text-[0.9rem] leading-[1.7] transition-[color] duration-200 ${flipped ? 'text-[rgba(244,245,248,0.42)]' : 'text-[var(--sa-white)]'}`}>
                {flipped ? card.deepDive : card.summary}
              </p>
            </div>
            <div className="flex justify-between items-center mt-[1.5rem]">
              <span className="text-[rgba(244,245,248,0.42)] text-[0.72rem]">{flipped ? 'Tap to see summary' : 'Tap for deep dive →'}</span>
              <button onClick={(e) => { e.stopPropagation(); setExpanded(card) }}
                className="flex items-center gap-[5px] text-[rgba(244,245,248,0.42)] bg-none border-none cursor-pointer text-[0.78rem] font-medium">
                <BookOpen size={13} /> Full Article
              </button>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex justify-center gap-[1rem]">
            <button onClick={prev} disabled={idx === 0}
              className={`flex items-center gap-[6px] p-[9px_20px] border rounded-[5px] text-[0.875rem] font-semibold ${idx === 0 ? 'bg-transparent border-[var(--sa-border)] text-[rgba(244,245,248,0.42)] cursor-default' : 'bg-[rgba(244,245,248,0.06)] border-[var(--sa-white)] text-[var(--sa-white)] cursor-pointer'}`}>
              <ChevronLeft size={16} /> Previous
            </button>
            <button onClick={next} disabled={idx === filtered.length - 1}
              className={`flex items-center gap-[6px] p-[9px_20px] border rounded-[5px] text-[0.875rem] font-bold ${idx === filtered.length - 1 ? 'bg-transparent border-[var(--sa-border)] text-[rgba(244,245,248,0.42)] cursor-default' : 'bg-[var(--sa-white)] border-[var(--sa-white)] text-[var(--sa-black)] cursor-pointer'}`}>
              Next <ChevronRight size={16} />
            </button>
          </div>
        </>
      ) : (
        <div className="bg-[var(--sa-surface)] border border-[var(--sa-border)] rounded-[8px] p-[3rem] text-center text-[rgba(244,245,248,0.42)]">
          No cards in this category.
        </div>
      )}

      {/* Full article modal */}
      {expanded && (
        <div onClick={() => setExpanded(null)}
          className="fixed inset-0 z-[100] bg-[rgba(0,0,0,0.7)] flex items-center justify-center p-[1.5rem]">
          <div onClick={(e) => e.stopPropagation()}
            className="bg-[var(--sa-surface)] border border-[var(--sa-border)] rounded-[10px] p-[2rem] max-w-[600px] w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-[1.25rem]">
              <span className="p-[3px_10px] bg-[rgba(244,245,248,0.05)] border border-[var(--sa-border)] rounded-[999px] text-[rgba(244,245,248,0.42)] text-[0.7rem]">{expanded.category}</span>
              <button onClick={() => setExpanded(null)} className="bg-none border-none text-[rgba(244,245,248,0.42)] cursor-pointer p-[2px] flex"><X size={18} /></button>
            </div>
            <h2 className="text-[var(--sa-white)] text-[1.4rem] font-bold mb-[1rem]">{expanded.title}</h2>
            <p className="text-[rgba(244,245,248,0.42)] text-[0.9rem] leading-[1.75]">{expanded.deepDive}</p>
          </div>
        </div>
      )}
    </div>
  )
}
