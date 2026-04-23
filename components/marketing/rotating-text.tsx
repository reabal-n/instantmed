'use client'

import { AnimatePresence,motion } from 'framer-motion'
import { useCallback,useEffect, useState } from 'react'

import { useReducedMotion } from '@/components/ui/motion'
import { cn } from '@/lib/utils'

interface RotatingTextProps {
  texts: string[]
  interval?: number
  className?: string
}

export function RotatingText({
  texts,
  interval = 3000,
  className,
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

  const currentText = texts[currentIndex]

  if (prefersReducedMotion) {
    return (
      <span className={cn("text-balance text-primary", className)}>
        {currentText}
      </span>
    )
  }

  return (
    <span className="inline-block min-h-[1.2em]">
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={currentIndex}
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -12, opacity: 0 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className={cn("inline-block text-balance text-primary", className)}
        >
          {currentText}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}
