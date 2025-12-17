'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

interface RotatingTextProps {
  texts: string[]
  interval?: number
  className?: string
  gradient?: boolean
}

// Check reduced motion preference outside component to avoid effect issues
function getReducedMotionPreference(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function RotatingText({ 
  texts, 
  interval = 3000,
  className,
  gradient = true
}: RotatingTextProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
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
    setCurrentIndex((prev) => (prev + 1) % texts.length)
  }, [texts.length])

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
          <span className={cn(
            "whitespace-nowrap",
            gradient && "bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500 bg-clip-text text-transparent",
            className
          )}>
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
      <span className="absolute inset-0 flex items-center justify-start overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.span
            key={currentIndex}
            initial={{ y: 40, opacity: 0, rotateX: -90 }}
            animate={{ y: 0, opacity: 1, rotateX: 0 }}
            exit={{ y: -40, opacity: 0, rotateX: 90 }}
            transition={{
              duration: 0.5,
              ease: [0.4, 0, 0.2, 1],
            }}
            className={cn(
              "inline-block whitespace-nowrap",
              gradient && "bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500 bg-clip-text text-transparent",
              className
            )}
            style={{ perspective: '1000px' }}
          >
            {texts[currentIndex]}
          </motion.span>
        </AnimatePresence>
      </span>
    </span>
  )
}
