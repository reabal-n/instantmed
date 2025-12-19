'use client'

import { useState, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'

interface RotatingTextProps {
  texts: string[]
  interval?: number
  className?: string
}

export function RotatingText({ 
  texts, 
  interval = 2500,
  className 
}: RotatingTextProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    // Check for reduced motion preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches)
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  const rotateText = useCallback(() => {
    if (prefersReducedMotion) {
      setCurrentIndex((prev) => (prev + 1) % texts.length)
      return
    }

    setIsAnimating(true)
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % texts.length)
      setIsAnimating(false)
    }, 300)
  }, [texts.length, prefersReducedMotion])

  useEffect(() => {
    const timer = setInterval(rotateText, interval)
    return () => clearInterval(timer)
  }, [interval, rotateText])

  if (prefersReducedMotion) {
    return (
      <span className={className}>
        {texts[currentIndex]}
      </span>
    )
  }

  return (
    <span className="relative inline-block overflow-hidden">
      <span
        className={cn(
          "inline-block transition-all duration-300 ease-out",
          isAnimating 
            ? "translate-y-full opacity-0" 
            : "translate-y-0 opacity-100",
          className
        )}
      >
        {texts[currentIndex]}
      </span>
    </span>
  )
}
