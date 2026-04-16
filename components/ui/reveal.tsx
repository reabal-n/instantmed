"use client"

import { useEffect, useRef } from "react"

import { cn } from "@/lib/utils"

interface RevealProps {
  children: React.ReactNode
  className?: string
  /** Delay in seconds before the animation starts, e.g. 0.1 */
  delay?: number
  /**
   * Skip the opacity:0 hidden state entirely — renders visible in the SSR HTML
   * with no IntersectionObserver setup. Use for elements that are in or near
   * the initial viewport where `reveal-hidden` would delay the LCP measurement.
   */
  instant?: boolean
}

/**
 * Lightweight scroll-reveal island — replaces framer-motion `whileInView`.
 *
 * Renders with CSS class `reveal-hidden` (opacity:0, translateY(12px)) on the
 * server. IntersectionObserver adds `reveal-visible` when the element enters
 * the viewport, triggering a CSS keyframe animation.
 *
 * Use `instant` for elements near the fold (first section below the hero) so
 * they are visible in the SSR HTML and are immediately LCP-eligible.
 *
 * `prefers-reduced-motion` is handled globally in globals.css, which sets
 * `animation-duration: 0.01ms !important` — so the element appears instantly
 * rather than staying invisible.
 */
export function Reveal({ children, className, delay = 0, instant = false }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (instant) return

    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (delay) el.style.animationDelay = `${delay}s`
          el.classList.replace("reveal-hidden", "reveal-visible")
          observer.disconnect()
        }
      },
      { threshold: 0.08, rootMargin: "0px 0px -32px 0px" },
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [delay, instant])

  if (instant) {
    return (
      <div className={className}>
        {children}
      </div>
    )
  }

  return (
    <div ref={ref} className={cn("reveal-hidden", className)}>
      {children}
    </div>
  )
}
