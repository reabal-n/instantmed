"use client"

import { motion } from "framer-motion"
import { useReducedMotion } from "@/components/ui/motion"
import { Check, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

// Animation variants
export const fadeSlide = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
}

export const staggerChildren = {
  animate: {
    transition: {
      staggerChildren: 0.05,
    },
  },
}

export const childFade = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
}

// Reusable Components
export function ProgressBar({ steps, currentIndex }: { steps: string[]; currentIndex: number }) {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        {steps.map((step, i) => (
          <div key={step} className="flex items-center">
            <div
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300",
                i < currentIndex
                  ? "bg-primary text-primary-foreground"
                  : i === currentIndex
                    ? "bg-primary/20 text-primary border-2 border-primary"
                    : "bg-muted text-muted-foreground border border-border"
              )}
            >
              {i < currentIndex ? <Check className="w-4 h-4" /> : i + 1}
            </div>
            {i < steps.length - 1 && (
              <div
                className={cn(
                  "h-0.5 w-12 sm:w-20 mx-2 transition-all duration-300",
                  i < currentIndex ? "bg-primary" : "bg-muted"
                )}
              />
            )}
          </div>
        ))}
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        {steps.map((step, i) => (
          <span
            key={step}
            className={cn(
              "transition-colors",
              i <= currentIndex ? "text-foreground font-medium" : ""
            )}
          >
            {step}
          </span>
        ))}
      </div>
    </div>
  )
}

export function SelectCard({
  selected,
  onClick,
  icon: Icon,
  title,
  description,
  disabled,
}: {
  selected: boolean
  onClick: () => void
  icon: React.ElementType
  title: string
  description: string
  disabled?: boolean
}) {
  const prefersReducedMotion = useReducedMotion()

  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "w-full p-4 sm:p-5 rounded-2xl border-2 text-left transition-all",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        "active:scale-[0.98]",
        selected
          ? "border-primary bg-primary/5 shadow-sm"
          : "bg-white dark:bg-background border-border hover:border-primary/50 hover:shadow-sm",
        disabled && "opacity-50 cursor-not-allowed"
      )}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="flex items-start gap-4">
        <div
          className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors",
            selected ? "bg-primary text-white" : "bg-muted text-muted-foreground border border-border"
          )}
        >
          <Icon className="w-6 h-6" />
        </div>
        <div className="flex-1 min-w-0">
          <p className={cn("font-semibold text-base", selected && "text-primary")}>{title}</p>
          <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
        </div>
        {selected && (
          <motion.div
            initial={prefersReducedMotion ? {} : { scale: 0 }}
            animate={{ scale: 1 }}
            className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shrink-0"
          >
            <Check className="w-4 h-4 text-white" />
          </motion.div>
        )}
      </div>
    </motion.button>
  )
}

export function DurationChip({
  selected,
  onClick,
  label,
}: {
  selected: boolean
  onClick: () => void
  label: string
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      className={cn(
        "px-4 py-3 rounded-xl font-medium text-sm transition-all min-h-[48px]",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        selected
          ? "bg-primary text-white shadow-sm"
          : "bg-white dark:bg-background border-2 border-border hover:border-primary/50 hover:shadow-sm"
      )}
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.97 }}
    >
      {label}
    </motion.button>
  )
}

export function SymptomChip({
  selected,
  onClick,
  label,
}: {
  selected: boolean
  onClick: () => void
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "px-3 py-2 rounded-lg text-sm font-medium transition-all min-h-[40px]",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        selected
          ? "bg-primary/10 text-primary border border-primary"
          : "bg-white dark:bg-background hover:bg-muted/50 border border-border"
      )}
    >
      {label}
    </button>
  )
}

export function FormField({
  label,
  error,
  hint,
  required,
  children,
}: {
  label: string
  error?: string
  hint?: string
  required?: boolean
  children: React.ReactNode
}) {
  const prefersReducedMotion = useReducedMotion()

  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground flex items-center gap-1">
        {label}
        {required && <span className="text-destructive">*</span>}
      </label>
      {children}
      {error && (
        <motion.p
          initial={prefersReducedMotion ? {} : { opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xs text-destructive flex items-center gap-1"
        >
          <AlertCircle className="w-3 h-3" />
          {error}
        </motion.p>
      )}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}
