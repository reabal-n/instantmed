"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface ShakeAnimationProps {
  children: React.ReactNode
  /** Trigger the shake animation */
  trigger: boolean
  /** Intensity of shake */
  intensity?: "light" | "medium" | "strong"
  /** Duration in seconds */
  duration?: number
  className?: string
}

const intensityValues = {
  light: 3,
  medium: 6,
  strong: 10,
}

/**
 * Shake animation for form validation errors
 */
export function ShakeAnimation({
  children,
  trigger,
  intensity = "medium",
  duration = 0.5,
  className,
}: ShakeAnimationProps) {
  const shakeAmount = intensityValues[intensity]

  return (
    <motion.div
      className={className}
      animate={
        trigger
          ? {
              x: [0, -shakeAmount, shakeAmount, -shakeAmount, shakeAmount, 0],
              transition: { duration },
            }
          : {}
      }
    >
      {children}
    </motion.div>
  )
}

/**
 * Input wrapper with shake animation on error
 */
export function ShakeInput({
  children,
  hasError,
  className,
}: {
  children: React.ReactNode
  hasError: boolean
  className?: string
}) {
  return (
    <motion.div
      className={cn("relative", className)}
      animate={
        hasError
          ? {
              x: [0, -4, 4, -4, 4, -2, 2, 0],
              transition: { duration: 0.4, ease: "easeInOut" },
            }
          : {}
      }
    >
      {children}
    </motion.div>
  )
}

/**
 * Form error message with entrance animation
 */
export function AnimatedErrorMessage({
  message,
  className,
}: {
  message?: string
  className?: string
}) {
  if (!message) return null

  return (
    <motion.p
      initial={{ opacity: 0, y: -10, height: 0 }}
      animate={{ opacity: 1, y: 0, height: "auto" }}
      exit={{ opacity: 0, y: -10, height: 0 }}
      transition={{ duration: 0.2 }}
      className={cn("text-sm text-destructive mt-1", className)}
    >
      {message}
    </motion.p>
  )
}

export default ShakeAnimation
