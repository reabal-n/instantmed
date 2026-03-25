"use client"

import { cn } from "@/lib/utils"
import { motion } from "framer-motion"
import { useReducedMotion } from "@/components/ui/motion"

interface ChatProgressProps {
  currentStep: number
  totalSteps: number
  labels?: string[]
}

export function ChatProgress({ currentStep, totalSteps, labels }: ChatProgressProps) {
  const prefersReducedMotion = useReducedMotion()
  const progress = Math.min(Math.max(currentStep / totalSteps, 0), 1)
  
  return (
    <div className="flex items-center gap-1.5 px-2">
      {Array.from({ length: totalSteps }).map((_, idx) => {
        const isCompleted = idx < currentStep
        const isCurrent = idx === currentStep - 1
        
        return (
          <motion.div
            key={idx}
            initial={prefersReducedMotion ? {} : { scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={prefersReducedMotion ? { duration: 0 } : { delay: idx * 0.05 }}
            className={cn(
              "h-1.5 rounded-full transition-all duration-300",
              isCompleted || isCurrent
                ? "bg-primary-foreground"
                : "bg-primary-foreground/30",
              isCurrent ? "w-4" : "w-1.5"
            )}
            title={labels?.[idx]}
          />
        )
      })}
      <span className="text-xs text-primary-foreground/70 ml-1">
        {Math.round(progress * 100)}%
      </span>
    </div>
  )
}

export function ChatProgressBar({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) {
  const prefersReducedMotion = useReducedMotion()
  const progress = Math.min(Math.max(currentStep / totalSteps, 0), 1)
  
  return (
    <div className="h-0.5 bg-primary-foreground/20 w-full">
      <motion.div
        className="h-full bg-primary-foreground"
        initial={prefersReducedMotion ? {} : { width: 0 }}
        animate={{ width: `${progress * 100}%` }}
        transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.3, ease: "easeOut" }}
      />
    </div>
  )
}
