'use client'

import { type ReactNode, useEffect, useRef, useState, useCallback } from 'react'

// Lightweight fade-in wrapper using IntersectionObserver + CSS transitions.
// Avoids importing framer-motion on the landing page's initial JS bundle.
// The content renders immediately on SSR; animations are applied post-hydration.

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

    // Use IntersectionObserver for whileInView behaviour
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          // Small delay to simulate the stagger effect
          setTimeout(() => setIsVisible(true), delay * 1000)
          observer.disconnect()
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [delay])

  return (
    <div
      ref={ref}
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
