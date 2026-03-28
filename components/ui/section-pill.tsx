"use client"

import { type ReactNode } from "react"
import { motion } from "framer-motion"
import { useReducedMotion } from "@/components/ui/motion"
import { cn } from "@/lib/utils"

interface SectionPillProps {
  children: ReactNode
  className?: string
}

export function SectionPill({ children, className }: SectionPillProps) {
  const prefersReducedMotion = useReducedMotion()

  return (
    <motion.span
      className={cn(
        "inline-flex items-center rounded-full border border-border/60",
        "bg-background px-4 py-1.5 text-xs font-medium text-foreground/70",
        "shadow-sm shadow-primary/[0.04]",
        "dark:bg-white/[0.06] dark:border-white/10 dark:text-foreground/70",
        className
      )}
      initial={prefersReducedMotion ? {} : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      {children}
    </motion.span>
  )
}
