"use client"

import { motion, useMotionValue, useSpring } from "framer-motion"
import React, { useCallback,useRef } from "react"

import { useReducedMotion } from "@/components/ui/motion"
import { cn } from "@/lib/utils"

interface MagneticButtonProps {
  children: React.ReactNode
  className?: string
  /** How far the button can pull toward cursor (px). Default 6 */
  strength?: number
}

/**
 * Wraps children with a subtle magnetic pull effect.
 * The element shifts slightly toward the cursor on hover,
 * creating a tactile "attracted" sensation.
 */
export function MagneticButton({
  children,
  className,
  strength = 6,
}: MagneticButtonProps) {
  const ref = useRef<HTMLDivElement>(null)
  const prefersReducedMotion = useReducedMotion()

  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const springX = useSpring(x, { damping: 15, stiffness: 200 })
  const springY = useSpring(y, { damping: 15, stiffness: 200 })

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (prefersReducedMotion || !ref.current) return
      const rect = ref.current.getBoundingClientRect()
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2
      x.set((e.clientX - centerX) * (strength / (rect.width / 2)))
      y.set((e.clientY - centerY) * (strength / (rect.height / 2)))
    },
    [prefersReducedMotion, strength, x, y]
  )

  const handleMouseLeave = useCallback(() => {
    x.set(0)
    y.set(0)
  }, [x, y])

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ x: springX, y: springY }}
      className={cn("inline-block", className)}
    >
      {children}
    </motion.div>
  )
}
