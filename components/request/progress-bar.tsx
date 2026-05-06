"use client"

import { motion } from "framer-motion"
import { Check } from "lucide-react"

import { useReducedMotion } from "@/components/ui/motion"
import { easing } from "@/lib/motion"
import { cn } from "@/lib/utils"

interface ProgressBarProps {
  steps: { id: string; shortLabel: string }[]
  currentIndex: number
  onStepClick: (stepId: string, index: number) => void
}

export function ProgressBar({ steps, currentIndex, onStepClick }: ProgressBarProps) {
  const prefersReducedMotion = useReducedMotion()
  const progressPercent =
    steps.length <= 1 ? 100 : (currentIndex / (steps.length - 1)) * 100

  return (
    <nav className="w-full" aria-label="Request progress">
      <div className="relative h-10 sm:h-[3.35rem]">
        <div className="absolute left-3 right-3 top-4 h-1.5 overflow-hidden rounded-full bg-muted/70 sm:top-3.5">
          <motion.div
            className="h-full rounded-full"
            style={{
              background:
                "linear-gradient(90deg, oklch(0.62 0.18 246), oklch(0.7 0.13 190), oklch(0.74 0.13 150))",
              boxShadow: "0 0 18px oklch(0.7 0.13 190 / 0.28)",
            }}
            initial={prefersReducedMotion ? {} : { width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{
              duration: prefersReducedMotion ? 0 : 0.32,
              ease: easing.panel,
            }}
          />
        </div>

        <div
          className="relative z-10 grid"
          style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}
        >
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
                className={cn(
                  "group flex min-h-10 flex-col items-center outline-none",
                  isClickable ? "cursor-pointer" : "cursor-default",
                )}
                aria-current={isCurrent ? "step" : undefined}
                aria-label={`${step.shortLabel}${isCompleted ? " completed" : isCurrent ? " current" : ""}`}
              >
                <span className="relative flex h-9 w-full items-center justify-center">
                  {isCurrent && !prefersReducedMotion && (
                    <motion.span
                      aria-hidden="true"
                      className="absolute h-8 w-8 rounded-full bg-primary/15"
                      animate={{ scale: [0.82, 1.18], opacity: [0.5, 0] }}
                      transition={{
                        duration: 1.4,
                        ease: "easeOut",
                        repeat: Infinity,
                        repeatDelay: 0.35,
                      }}
                    />
                  )}

                  <motion.div
                    layoutId={isCurrent ? "request-progress-current" : undefined}
                    initial={prefersReducedMotion ? {} : { scale: isCompleted ? 0.9 : 1 }}
                    animate={{ scale: isCurrent ? 1.08 : 1, opacity: 1 }}
                    transition={{
                      duration: prefersReducedMotion ? 0 : 0.22,
                      ease: easing.panel,
                    }}
                    className={cn(
                      "relative flex items-center justify-center rounded-full border transition-[background-color,border-color,box-shadow,transform] duration-200",
                      "focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2",
                      isCurrent &&
                        "h-5 w-5 border-primary bg-background shadow-md shadow-primary/20 ring-4 ring-sky-200/50",
                      isCompleted &&
                        "h-5 w-5 border-transparent text-primary-foreground shadow-sm",
                      !isCompleted &&
                        !isCurrent &&
                        "h-3 w-3 border-border/70 bg-background group-hover:border-primary/40",
                    )}
                    style={
                      isCompleted
                        ? {
                            background:
                              "linear-gradient(135deg, oklch(0.62 0.18 246), oklch(0.72 0.13 170))",
                          }
                        : undefined
                    }
                  >
                    {isCompleted && <Check className="h-3 w-3" strokeWidth={3} />}
                    {isCurrent && (
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{
                          background:
                            "linear-gradient(135deg, oklch(0.62 0.18 246), oklch(0.74 0.13 150))",
                        }}
                      />
                    )}
                  </motion.div>
                </span>

                <span
                  className={cn(
                    "hidden max-w-[4.8rem] truncate text-center text-[11px] font-medium leading-none transition-colors sm:block",
                    isCurrent
                      ? "text-foreground"
                      : isCompleted
                        ? "text-muted-foreground"
                        : "text-muted-foreground/70",
                    isClickable && !isCurrent && "group-hover:text-primary",
                  )}
                >
                  {step.shortLabel}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
