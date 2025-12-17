"use client"

import { cn } from "@/lib/utils"
import { Check } from "lucide-react"

interface StepProgressProps {
  currentStep: number
  totalSteps: number
  steps?: string[]
  className?: string
}

export function StepProgress({ currentStep, totalSteps, steps, className }: StepProgressProps) {
  const progress = ((currentStep - 1) / (totalSteps - 1)) * 100

  return (
    <div className={cn("w-full", className)}>
      {/* Progress bar */}
      <div className="relative mb-2">
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        
        {/* Step indicators */}
        <div className="absolute inset-0 flex justify-between items-center">
          {Array.from({ length: totalSteps }).map((_, index) => {
            const stepNumber = index + 1
            const isCompleted = stepNumber < currentStep
            const isCurrent = stepNumber === currentStep
            
            return (
              <div
                key={index}
                className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-all duration-300",
                  isCompleted && "bg-primary text-primary-foreground",
                  isCurrent && "bg-primary text-primary-foreground ring-4 ring-primary/20",
                  !isCompleted && !isCurrent && "bg-muted text-muted-foreground"
                )}
              >
                {isCompleted ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  stepNumber
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Step labels */}
      {steps && steps.length > 0 && (
        <div className="flex justify-between">
          {steps.map((step, index) => {
            const stepNumber = index + 1
            const isCompleted = stepNumber < currentStep
            const isCurrent = stepNumber === currentStep
            
            return (
              <span
                key={index}
                className={cn(
                  "text-xs transition-colors text-center max-w-[80px]",
                  isCompleted && "text-primary",
                  isCurrent && "text-foreground font-medium",
                  !isCompleted && !isCurrent && "text-muted-foreground"
                )}
              >
                {step}
              </span>
            )
          })}
        </div>
      )}

      {/* Simple step counter for mobile */}
      <div className="flex justify-center mt-2 sm:hidden">
        <span className="text-xs text-muted-foreground">
          Step {currentStep} of {totalSteps}
        </span>
      </div>
    </div>
  )
}

// Compact version for mobile
export function StepProgressCompact({ currentStep, totalSteps, className }: Omit<StepProgressProps, 'steps'>) {
  const progress = (currentStep / totalSteps) * 100

  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
          {currentStep}/{totalSteps}
        </span>
      </div>
    </div>
  )
}
