"use client"

import React from "react"
import { motion } from "framer-motion"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

interface EnhancedSelectionButtonProps {
  selected: boolean
  onClick: () => void
  children?: React.ReactNode
  className?: string
  variant?: "default" | "chip" | "card" | "option"
  icon?: React.ElementType
  label?: string
  description?: string
}

export function EnhancedSelectionButton({
  selected,
  onClick,
  children,
  className,
  variant = "default",
  icon: Icon,
  label,
  description,
}: EnhancedSelectionButtonProps) {
  const baseClasses = "relative transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
  
  // Lumen brand: Selections feel like light settling, not color switching
  // Subtle outline emphasis, gentle surface change, soft light shift
  const variantClasses = {
    chip: cn(
      "px-4 py-2.5 min-h-[44px] min-w-[44px] rounded-xl text-sm font-medium",
      // Add right padding to prevent text overlapping with absolute checkmark
      "pr-7",
      selected
        ? "bg-sky-50 dark:bg-sky-900/30 text-sky-800 dark:text-sky-200 border-2 border-sky-300/60 dark:border-sky-600/40 shadow-[0_2px_8px_rgba(138,187,224,0.15)]"
        : "bg-white/90 dark:bg-white/5 border-2 border-white/50 dark:border-white/10 hover:border-white/60 hover:bg-white text-slate-700 dark:text-slate-300"
    ),
    card: cn(
      "w-full p-5 rounded-2xl border-2 text-left",
      selected
        ? "bg-sky-50/80 dark:bg-sky-900/20 border-sky-300/60 dark:border-sky-600/40 text-slate-800 dark:text-slate-200 shadow-[0_2px_12px_rgba(138,187,224,0.12)]"
        : "border-white/50 dark:border-white/10 bg-white/90 dark:bg-white/5 hover:border-white/60 hover:bg-white text-slate-800 dark:text-slate-200"
    ),
    option: cn(
      "w-full p-3 min-h-[64px] rounded-xl border-2 flex items-center gap-2.5 text-left",
      selected
        ? "bg-sky-50/80 dark:bg-sky-900/20 border-sky-300/60 dark:border-sky-600/40 text-slate-800 dark:text-slate-200 shadow-[0_2px_8px_rgba(138,187,224,0.12)]"
        : "border-white/50 dark:border-white/10 bg-white/90 dark:bg-white/5 hover:border-white/60 hover:bg-white text-slate-800 dark:text-slate-200"
    ),
    default: cn(
      "px-4 py-2 rounded-lg",
      selected
        ? "bg-sky-50 dark:bg-sky-900/30 text-sky-800 dark:text-sky-200 border border-sky-300/60"
        : "bg-white/60 dark:bg-white/5 hover:bg-white/80 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300"
    ),
  }

  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.96 }}
      transition={{ duration: 0.1 }}
      className={cn(baseClasses, variantClasses[variant], className)}
      aria-pressed={selected}
    >
      {variant === "option" && Icon && (
        <div
          className={cn(
            "w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors duration-150",
            selected
              ? "bg-sky-100 dark:bg-sky-800/40 text-sky-600 dark:text-sky-400"
              : "bg-white/60 dark:bg-white/10 text-slate-500 dark:text-slate-400"
          )}
        >
          <Icon className="w-4 h-4" />
        </div>
      )}

      {variant === "card" && Icon && (
        <div
          className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center mb-2 transition-colors duration-150",
            selected
              ? "bg-sky-100 dark:bg-sky-800/40 text-sky-600 dark:text-sky-400"
              : "bg-white/60 dark:bg-white/10 text-slate-500 dark:text-slate-400"
          )}
        >
          <Icon className="w-6 h-6" />
        </div>
      )}

      <div className="flex-1 min-w-0">
        {label && (
          <div className={cn("font-medium block", variant === "option" ? "text-sm leading-tight" : "text-sm mb-1")}>{label}</div>
        )}
        {description && (
          <div className="text-xs opacity-90">{description}</div>
        )}
        {!label && !description && children}
      </div>

      {/* Calm checkmark indicator for selected state */}
      {selected && variant !== "chip" && (
        <div
          className={cn(
            "shrink-0 flex items-center justify-center rounded-full",
            variant === "option" || variant === "card" ? "w-5 h-5 bg-sky-100 dark:bg-sky-800/40" : "w-4 h-4"
          )}
        >
          <Check className={cn(
            "text-sky-600 dark:text-sky-400",
            variant === "option" || variant === "card" ? "w-3 h-3" : "w-full h-full"
          )} />
        </div>
      )}

      {/* Chip variant: Absolute positioned checkmark (top-right) */}
      {selected && variant === "chip" && (
        <div
          className="absolute top-1 right-1 w-4 h-4 flex items-center justify-center rounded-full bg-sky-100 dark:bg-sky-800/40"
        >
          <Check className="w-3 h-3 text-sky-600 dark:text-sky-400" />
        </div>
      )}
    </motion.button>
  )
}

