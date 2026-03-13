'use client'

import { useState, useEffect, useCallback } from 'react'
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

  const rotateText = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % texts.length)
  }, [texts.length])

  useEffect(() => {
    const timer = setInterval(rotateText, interval)
    return () => clearInterval(timer)
  }, [interval, rotateText])

  const gradientClasses = gradient
    ? "bg-linear-to-r from-blue-600 via-blue-500 to-blue-400 dark:from-sky-400 dark:via-cyan-400 dark:to-teal-400 bg-clip-text"
    : ""

  const gradientStyle = gradient
    ? { WebkitTextFillColor: 'transparent' } as React.CSSProperties
    : undefined

  const currentText = texts[currentIndex]

  if (prefersReducedMotion) {
    return (
      <span
        className={cn("text-balance", gradientClasses, className)}
        style={gradientStyle}
      >
        {currentText}
      </span>
    )
  }

  return (
    <span className="inline-block min-h-[1.2em]">
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={currentIndex}
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -16, opacity: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className={cn("inline-block text-balance", gradientClasses, className)}
          style={gradientStyle}
        >
          {currentText}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}
