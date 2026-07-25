'use client'

import { type ReactNode, useEffect, useRef, useState } from 'react'

// Lightweight fade-in wrapper using IntersectionObserver + CSS transitions.
// Avoids importing framer-motion on the landing page's initial JS bundle.
// Falls back to visible when IntersectionObserver is unavailable, so the copy
// is never left stuck at opacity 0.

interface AnimatedWrapperProps {
  children: ReactNode
  delay?: number
}

export default function AnimatedWrapper({ children, delay = 0 }: AnimatedWrapperProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof IntersectionObserver === 'undefined') {
      const id = setTimeout(() => setIsVisible(true), 0)
      return () => clearTimeout(id)
    }

    // Use IntersectionObserver for whileInView behaviour
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          // Small delay to simulate the stagger effect
          setTimeout(() => setIsVisible(true), delay * 1000)
          observer.disconnect()
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' },
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [delay])

  return (
    <div
      ref={ref}
      // w-full so the wrapper fills its flex/grid parent — without it the
      // `mx-auto` on the content inside has no room to centre in.
      className="w-full"
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(28px)',
        transition: `opacity 0.6s ease ${delay * 0.3}s, transform 0.6s ease ${delay * 0.3}s`,
      }}
    >
      {children}
    </div>
  )
}
