"use client"

import { ReactNode } from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface AnimatedGradientProps {
  children: ReactNode
  className?: string
  colors?: string[]
  duration?: number
}

export function AnimatedGradient({
  children,
  className,
  colors = [
    "oklch(0.9 0.15 175)",
    "oklch(0.85 0.12 280)",
    "oklch(0.8 0.1 350)",
    "oklch(0.85 0.12 280)",
    "oklch(0.9 0.15 175)",
  ],
  duration = 8,
}: AnimatedGradientProps) {
  return (
    <div className={cn("relative overflow-hidden rounded-2xl", className)}>
      <motion.div
        className="absolute inset-0"
        animate={{
          background: [
            `linear-gradient(135deg, ${colors[0]}, ${colors[1]})`,
            `linear-gradient(180deg, ${colors[1]}, ${colors[2]})`,
            `linear-gradient(225deg, ${colors[2]}, ${colors[3]})`,
            `linear-gradient(270deg, ${colors[3]}, ${colors[4]})`,
            `linear-gradient(315deg, ${colors[4]}, ${colors[0]})`,
            `linear-gradient(135deg, ${colors[0]}, ${colors[1]})`,
          ],
        }}
        transition={{
          duration,
          repeat: Infinity,
          ease: "linear",
        }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  )
}
