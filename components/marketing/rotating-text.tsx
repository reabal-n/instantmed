'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface RotatingTextProps {
  texts: string[]
  interval?: number
  className?: string
  gradient?: boolean
}

export function RotatingText({
  texts,
  interval = 3000,
  className,
  gradient = true
}: RotatingTextProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const prefersReducedMotion = useReducedMotion()

  const longestText = useMemo(() => {
    return texts.reduce((a, b) => a.length > b.length ? a : b, '')
  }, [texts])

  const rotateText = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % texts.length)
  }, [texts.length])

  useEffect(() => {
    const timer = setInterval(rotateText, interval)
    return () => clearInterval(timer)
  }, [interval, rotateText])

  const gradientClasses = gradient
    ? "bg-linear-to-r from-blue-600 via-blue-500 to-blue-400 dark:from-sky-400 dark:via-cyan-400 dark:to-teal-400 bg-clip-text text-transparent"
    : ""

  const animatedGradientClasses = gradient
    ? "bg-linear-to-r from-blue-600 via-blue-500 to-blue-400 dark:from-sky-400 dark:via-cyan-400 dark:to-teal-400 bg-clip-text text-transparent animate-gradient-text bg-[length:200%_auto]"
    : ""

  const currentText = texts[currentIndex]

  if (prefersReducedMotion) {
    return (
      <>
        {/* Mobile: simple inline, wrapping allowed */}
        <span className={cn("sm:hidden text-balance", gradientClasses, className)}>
          {currentText}
        </span>
        {/* Desktop: spacer-based stable width */}
        <span className="relative hidden sm:inline-block whitespace-nowrap">
          <span className={cn("invisible whitespace-nowrap", className)} aria-hidden="true">
            {longestText}
          </span>
          <span className="absolute inset-0 flex items-center justify-center lg:justify-start">
            <span className={cn("whitespace-nowrap", gradientClasses, className)}>
              {currentText}
            </span>
          </span>
        </span>
      </>
    )
  }

  return (
    <>
      {/* Mobile: simple inline animation, no spacer trick */}
      <span className="sm:hidden inline-block min-h-[2.5em]">
        <AnimatePresence mode="wait">
          <motion.span
            key={`mobile-${currentIndex}`}
            initial={{ y: 16, opacity: 0, filter: 'blur(4px)' }}
            animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
            exit={{ y: -16, opacity: 0, filter: 'blur(4px)' }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className={cn("inline-block text-balance", animatedGradientClasses, className)}
          >
            {currentText}
          </motion.span>
        </AnimatePresence>
      </span>

      {/* Desktop: spacer-based stable-width animation */}
      <span className="relative hidden sm:inline-block whitespace-nowrap">
        <span className={cn("invisible whitespace-nowrap", className)} aria-hidden="true">
          {longestText}
        </span>
        <span className="absolute inset-0 flex items-center justify-center lg:justify-start overflow-hidden perspective-1000">
          <AnimatePresence mode="wait">
            <motion.span
              key={`desktop-${currentIndex}`}
              initial={{
                y: 30,
                opacity: 0,
                rotateX: -45,
                filter: 'blur(8px)',
                scale: 0.95
              }}
              animate={{
                y: 0,
                opacity: 1,
                rotateX: 0,
                filter: 'blur(0px)',
                scale: 1
              }}
              exit={{
                y: -30,
                opacity: 0,
                rotateX: 45,
                filter: 'blur(8px)',
                scale: 0.95
              }}
              transition={{
                duration: 0.6,
                ease: [0.22, 1, 0.36, 1],
              }}
              className={cn(
                "inline-block whitespace-nowrap",
                animatedGradientClasses,
                className
              )}
              style={{ transformStyle: 'preserve-3d' }}
            >
              {currentText}
            </motion.span>
          </AnimatePresence>
        </span>
      </span>
    </>
  )
}
