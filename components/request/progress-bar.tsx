"use client"

import { motion } from "framer-motion"
import { Check } from "lucide-react"

import { useReducedMotion } from "@/components/ui/motion"

interface ProgressBarProps {
  steps: { id: string; shortLabel: string }[]
  currentIndex: number
  onStepClick: (stepId: string, index: number) => void
}

export function ProgressBar({ steps, currentIndex, onStepClick }: ProgressBarProps) {
  const prefersReducedMotion = useReducedMotion()

  return (
    <div className="w-full flex gap-1.5" role="navigation" aria-label="Request progress">
      {steps.map((step, i) => {
        const isCompleted = i < currentIndex
        const isCurrent = i === currentIndex
        const isClickable = i <= currentIndex

        return (
          <button
            key={step.id}
            type="button"
            onClick={() => isClickable && onStepClick(step.id, i)}
            disabled={!isClickable}
            className={`flex-1 group min-h-[36px] sm:min-h-0 ${isClickable ? 'cursor-pointer' : 'cursor-default'}`}
            aria-current={isCurrent ? 'step' : undefined}
            aria-label={`${step.shortLabel}${isCompleted ? ' (completed)' : isCurrent ? ' (current)' : ''}`}
          >
            {/* Progress bar segment -- taller on mobile for better touch targets */}
            <div className="relative">
              <div
                className={`h-2 sm:h-1.5 rounded-full transition-[width] duration-300 ${
                  i <= currentIndex ? "bg-primary" : "bg-muted"
                } ${isClickable && !isCurrent ? "group-hover:bg-primary/70" : ""}`}
              />
              {/* Checkmark for completed steps -- hidden on mobile, dot indicator instead */}
              {isCompleted && (
                <>
                  {/* Mobile: small dot */}
                  <motion.div
                    initial={prefersReducedMotion ? {} : { scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-primary sm:hidden"
                  />
                  {/* Desktop: checkmark */}
                  <motion.div
                    initial={prefersReducedMotion ? {} : { scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="absolute -top-1 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-primary items-center justify-center hidden sm:flex"
                  >
                    <Check className="w-2.5 h-2.5 text-primary-foreground" strokeWidth={3} />
                  </motion.div>
                </>
              )}
            </div>
            {/* Label - hidden on mobile, visible on sm+ */}
            <span
              className={`text-xs mt-1.5 text-center font-medium transition-colors truncate hidden sm:block ${
                i <= currentIndex ? "text-foreground" : "text-muted-foreground"
              } ${isClickable && !isCurrent ? "group-hover:text-primary" : ""}`}
            >
              {step.shortLabel}
            </span>
          </button>
        )
      })}
    </div>
  )
}
