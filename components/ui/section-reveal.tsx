"use client"

import { motion, useReducedMotion } from "framer-motion"
import type { ReactNode } from "react"

interface SectionRevealProps {
  children: ReactNode
  className?: string
  delay?: number
  duration?: number
  yOffset?: number
  blur?: string
}

export function SectionReveal({
  children,
  className,
  delay = 0,
  duration = 0.5,
  yOffset = 10,
  blur = "3px",
}: SectionRevealProps) {
  const prefersReducedMotion = useReducedMotion()

  if (prefersReducedMotion) {
    return <div className={className}>{children}</div>
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: yOffset, filter: `blur(${blur})` }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{
        delay,
        duration,
        ease: [0.25, 0.1, 0.25, 1],
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
