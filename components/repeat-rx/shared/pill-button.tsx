"use client"

/**
 * Pill Button - Selectable pill-style button for options
 */

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface PillButtonProps {
  selected: boolean
  onClick: () => void
  children: React.ReactNode
  className?: string
}

export function PillButton({ selected, onClick, children, className }: PillButtonProps) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "min-h-[44px] px-4 py-2 rounded-full text-sm font-medium",
        "bg-white/70 dark:bg-white/5 backdrop-blur-xl",
        "border-2 border-white/40 dark:border-white/10",
        "transition-all duration-300 ease-out",
        selected
          ? "border-primary/50 bg-linear-to-r from-primary-500 to-primary-600 text-white shadow-[0_8px_30px_rgb(59,130,246,0.25)]"
          : "hover:border-primary/40 hover:bg-white/85 dark:hover:bg-white/10 hover:-translate-y-1 hover:shadow-[0_8px_24px_rgb(59,130,246,0.12)]",
        className
      )}
      whileHover={selected ? {} : { y: -2 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 200, damping: 30 }}
    >
      {children}
    </motion.button>
  )
}
