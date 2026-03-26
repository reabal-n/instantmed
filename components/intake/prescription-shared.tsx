"use client"

import { motion } from "framer-motion"
import { useReducedMotion } from "@/components/ui/motion"
import { Check, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { CinematicSwitch } from "@/components/ui/cinematic-switch"

// ============================================================================
// TYPES
// ============================================================================

export interface ProgressBarProps {
  steps: string[]
  currentIndex: number
}

export interface SelectCardProps {
  selected: boolean
  onClick: () => void
  icon: React.ElementType
  title: string
  description: string
  disabled?: boolean
}

export interface OptionChipProps {
  selected: boolean
  onClick: () => void
  label: string
}

export interface SafetyQuestionProps {
  question: string
  value: boolean | undefined
  onChange: (val: boolean) => void
}

export interface FormFieldProps {
  label: string
  error?: string
  hint?: string
  required?: boolean
  children: React.ReactNode
}

// ============================================================================
// COMPONENTS
// ============================================================================

export function ProgressBar({ steps, currentIndex }: ProgressBarProps) {
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
                    : "bg-muted border border-border/50 text-muted-foreground"
              )}
            >
              {i < currentIndex ? <Check className="w-4 h-4" /> : i + 1}
            </div>
            {i < steps.length - 1 && (
              <div
                className={cn(
                  "h-0.5 w-8 sm:w-12 mx-1 sm:mx-2 transition-all duration-300",
                  i < currentIndex ? "bg-linear-to-r from-primary-500 to-primary-600 shadow-[0_4px_16px_rgb(59,130,246,0.25)]" : "bg-muted border border-border/50"
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
              "transition-colors text-center flex-1",
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
}: SelectCardProps) {
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
          ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
          : "bg-white dark:bg-card border-border/50 hover:border-primary/50 hover:bg-muted/50 hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgb(59,130,246,0.1)]",
        disabled && "opacity-50 cursor-not-allowed"
      )}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="flex items-start gap-4">
        <div
          className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors",
            selected ? "bg-linear-to-r from-primary-500 to-primary-600 text-white shadow-[0_4px_16px_rgb(59,130,246,0.25)]" : "bg-muted border border-border/50 text-muted-foreground"
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

export function OptionChip({ selected, onClick, label }: OptionChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "px-4 py-2.5 rounded-xl text-sm font-medium transition-all min-h-[44px]",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        selected
          ? "bg-primary text-white shadow-lg shadow-primary/20"
          : "bg-white dark:bg-card border-2 border-border/50 hover:border-primary/50 hover:bg-muted/50 hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgb(59,130,246,0.1)]"
      )}
    >
      {label}
    </button>
  )
}

export function SafetyQuestion({ question, value, onChange }: SafetyQuestionProps) {
  return (
    <div className="flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-card border border-border/50 shadow-sm shadow-primary/[0.04]">
      <span className="text-sm font-medium pr-4 flex-1">{question}</span>
      <CinematicSwitch
        value={value}
        onChange={onChange}
        onLabel="YES"
        offLabel="NO"
        variant="safety"
        className="shrink-0"
      />
    </div>
  )
}

export function FormField({ label, error, hint, required, children }: FormFieldProps) {
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
