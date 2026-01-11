"use client"

import React from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface ProgressIndicatorCompactProps {
  currentStep: number
  totalSteps: number
  stepLabels?: string[]
  showTimeEstimate?: boolean
  timeRemaining?: number
  className?: string
}

export function ProgressIndicatorCompact({
  currentStep,
  totalSteps,
  stepLabels,
  showTimeEstimate = false,
  timeRemaining,
  className,
}: ProgressIndicatorCompactProps) {
  const steps = Array.from({ length: totalSteps }, (_, i) => i + 1)
  
  // Calculate progress width based on current step
  const getProgressWidth = () => {
    if (totalSteps === 3) {
      return currentStep === 1 ? 24 : currentStep === 2 ? 60 : 96
    } else if (totalSteps === 5) {
      return currentStep === 1 ? 24 : currentStep === 2 ? 48 : currentStep === 3 ? 72 : currentStep === 4 ? 96 : 120
    }
    // Default calculation for other step counts
    const stepWidth = 24
    const gap = 12
    return (currentStep - 1) * (stepWidth + gap) + stepWidth
  }

  const progressWidth = getProgressWidth()

  return (
    <div className={cn("flex items-center gap-3", className)}>
      {/* Progress dots */}
      <div className="flex items-center gap-4 relative">
        {steps.map((step) => (
          <div
            key={step}
            className={cn(
              "w-1.5 h-1.5 rounded-full relative z-10 transition-colors duration-300",
              step <= currentStep ? "bg-primary" : "bg-gray-300 dark:bg-slate-600"
            )}
          />
        ))}

        {/* Progress overlay */}
        <motion.div
          initial={{ width: '12px', height: "16px", x: 0 }}
          animate={{
            width: `${progressWidth}px`,
            x: 0
          }}
          className="absolute -left-[6px] -top-[6px] -translate-y-1/2 h-2 bg-primary rounded-full"
          transition={{
            type: "spring",
            stiffness: 200,
            damping: 20,
            mass: 0.8,
            bounce: 0.25,
            duration: 0.6
          }}
        />
      </div>

      {/* Step labels and time estimate */}
      <div className="flex items-center gap-2 text-xs">
        {stepLabels && stepLabels.length > 0 && (
          <span className="text-muted-foreground font-medium">
            {stepLabels[currentStep - 1] || `${currentStep}/${totalSteps}`}
          </span>
        )}
        {showTimeEstimate && timeRemaining !== undefined && timeRemaining > 0 && (
          <span className="text-muted-foreground">
            ~{timeRemaining} min remaining
          </span>
        )}
      </div>
    </div>
  )
}

