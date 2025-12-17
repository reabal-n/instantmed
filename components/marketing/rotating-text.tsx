'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { cn } from '@/lib/utils'

interface RotatingTextProps {
  texts: string[]
  interval?: number
  className?: string
}

// Check reduced motion preference outside component to avoid effect issues
function getReducedMotionPreference(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function RotatingText({ 
  texts, 
  interval = 2500,
  className 
}: RotatingTextProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(getReducedMotionPreference)

  // Find the longest text to reserve space and prevent layout shift
  const longestText = useMemo(() => {
    return texts.reduce((a, b) => a.length > b.length ? a : b, '')
  }, [texts])

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    
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

  // For reduced motion, still use the stable layout approach
  if (prefersReducedMotion) {
    return (
      <span className="relative inline-block">
        <span className={cn("invisible whitespace-nowrap", className)} aria-hidden="true">
          {longestText}
        </span>
        <span className="absolute inset-0 flex items-center justify-start">
          <span className={cn("whitespace-nowrap", className)}>
            {texts[currentIndex]}
          </span>
        </span>
      </span>
    )
  }

  return (
    <span className="relative inline-block">
      {/* Invisible text to reserve width */}
      <span className={cn("invisible whitespace-nowrap", className)} aria-hidden="true">
        {longestText}
      </span>
      {/* Actual rotating text positioned absolutely */}
      <span 
        className="absolute inset-0 flex items-center justify-start overflow-hidden"
      >
        <span
          className={cn(
            "inline-block transition-all duration-300 ease-out whitespace-nowrap",
            isAnimating 
              ? "translate-y-full opacity-0" 
              : "translate-y-0 opacity-100",
            className
          )}
        >
          {texts[currentIndex]}
        </span>
      </span>
    </span>
  )
}
