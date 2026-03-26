"use client"

/**
 * Pill Button - Selectable pill-style button for options
 */

import { motion } from "framer-motion"
import { useReducedMotion } from "@/components/ui/motion"
import { cn } from "@/lib/utils"

interface PillButtonProps {
  selected: boolean
  onClick: () => void
  children: React.ReactNode
  className?: string
}

export function PillButton({ selected, onClick, children, className }: PillButtonProps) {
  const prefersReducedMotion = useReducedMotion()

  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "min-h-[44px] px-4 py-2 rounded-full text-sm font-medium",
        "bg-white dark:bg-card",
        "border-2 border-border/50",
        "transition-all duration-300 ease-out",
        selected
          ? "border-primary/50 bg-linear-to-r from-primary-500 to-primary-600 text-white shadow-[0_8px_30px_rgb(59,130,246,0.25)]"
          : "hover:border-primary/40 hover:bg-muted/50 hover:-translate-y-1 hover:shadow-[0_8px_24px_rgb(59,130,246,0.12)]",
        className
      )}
      whileHover={prefersReducedMotion ? undefined : (selected ? {} : { y: -2 })}
      whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}
      transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.3, ease: "easeOut" }}
    >
      {children}
    </motion.button>
  )
}
