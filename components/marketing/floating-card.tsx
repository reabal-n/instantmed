"use client"

import { motion } from "framer-motion"

import { useReducedMotion } from "@/components/ui/motion"
import { cn } from "@/lib/utils"

interface FloatingCardProps {
  children: React.ReactNode
  className?: string
  delay?: number
  direction?: "left" | "right" | "up"
}

export function FloatingCard({ children, className, delay = 0, direction = "up" }: FloatingCardProps) {
  const prefersReducedMotion = useReducedMotion()

  const directionOffset = {
    left: { x: -20, y: 0 },
    right: { x: 20, y: 0 },
    up: { x: 0, y: 20 },
  }

  return (
    <motion.div
      className={cn(
        "rounded-2xl bg-white dark:bg-card border border-border/50 shadow-xl shadow-primary/[0.08] dark:shadow-none",
        className
      )}
      initial={prefersReducedMotion ? {} : { ...directionOffset[direction] }}
      whileInView={prefersReducedMotion ? {} : { opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, delay, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  )
}
