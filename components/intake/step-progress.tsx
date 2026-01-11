"use client"

import { cn } from "@/lib/utils"
import { Check } from "lucide-react"
import { motion } from "framer-motion"

interface StepProgressProps {
  currentStep: number
  totalSteps: number
  steps?: string[]
  className?: string
  showTimeEstimate?: boolean
  timeEstimates?: number[] // minutes per step
}

export function StepProgress({ 
  currentStep, 
  totalSteps, 
  steps, 
  className,
  showTimeEstimate = false,
  timeEstimates = []
}: StepProgressProps) {
  const progress = ((currentStep - 1) / (totalSteps - 1)) * 100
  
  // Calculate remaining time
  const remainingTime = showTimeEstimate && timeEstimates.length > 0
    ? timeEstimates.slice(currentStep - 1).reduce((sum, time) => sum + time, 0)
    : null

  // Compact mode for headers (when used in tight spaces)
  const isCompact = className?.includes('compact') || false

  if (isCompact) {
    // Calculate progress width based on current step
    // The progress bar should extend to cover all completed steps and reach the current step's dot
    const calculateProgressWidth = () => {
      // With flex-1 layout, steps are evenly distributed
      // Progress should extend proportionally: (currentStep / totalSteps) of container width
      // Account for the -6px initial offset
      const progressPercent = (currentStep / totalSteps) * 100
      
      // Use CSS calc to combine percentage with pixel offset
      // The progress bar starts at -6px, so we add that to the calculated width
      return `calc(${progressPercent}% + 6px)`
    }

    return (
      <div className={cn("w-full", className)}>
        {/* Progress dots with labels */}
        <div className="flex items-start gap-3 relative pb-4">
          {/* Animated progress overlay - behind dots */}
          <motion.div
            initial={{ width: '12px' }}
            animate={{
              width: calculateProgressWidth(),
            }}
            className="absolute -left-[6px] top-[3px] h-[2px] bg-primary rounded-full z-0"
            transition={{
              type: "spring",
              stiffness: 200,
              damping: 20,
              mass: 0.8,
              bounce: 0.25,
              duration: 0.6
            }}
          />
          
          {Array.from({ length: totalSteps }).map((_, index) => {
            const stepNumber = index + 1
            const isCompleted = stepNumber < currentStep
            const isCurrent = stepNumber === currentStep
            
            return (
              <div key={index} className="flex flex-col items-center gap-1 flex-1 min-w-0 relative z-10">
                {/* Dot */}
                <div className="relative">
                  <div
                    className={cn(
                      "w-1.5 h-1.5 rounded-full transition-colors duration-300",
                      (isCompleted || isCurrent) && "bg-primary",
                      !isCompleted && !isCurrent && "bg-gray-300 dark:bg-slate-600"
                    )}
                  />
                </div>
                
                {/* Step label */}
                {steps && steps.length > 0 && (
                  <span
                    className={cn(
                      "text-[10px] font-medium text-center leading-tight transition-colors duration-300",
                      isCurrent && "text-foreground font-semibold",
                      isCompleted && "text-primary",
                      !isCompleted && !isCurrent && "text-muted-foreground"
                    )}
                    title={steps[index]}
                  >
                    {steps[index] || `${stepNumber}`}
                  </span>
                )}
              </div>
            )
          })}
        </div>

        {/* Time estimate */}
        {showTimeEstimate && remainingTime !== null && remainingTime > 0 && (
          <div className="flex justify-center mt-1">
            <span className="text-[10px] text-muted-foreground whitespace-nowrap">
              ~{remainingTime} min
            </span>
          </div>
        )}
      </div>
    )
  }

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
        <div className="flex justify-between mb-1">
          {steps.map((step, index) => {
            const stepNumber = index + 1
            const isCompleted = stepNumber < currentStep
            const isCurrent = stepNumber === currentStep
            
            return (
              <span
                key={index}
                className={cn(
                  "text-xs transition-colors text-center max-w-[80px] truncate",
                  isCompleted && "text-primary",
                  isCurrent && "text-foreground font-medium",
                  !isCompleted && !isCurrent && "text-muted-foreground"
                )}
                title={step}
              >
                {step}
              </span>
            )
          })}
        </div>
      )}

      {/* Time estimate */}
      {showTimeEstimate && remainingTime !== null && remainingTime > 0 && (
        <div className="flex justify-center mt-1">
          <span className="text-xs text-muted-foreground">
            ~{remainingTime} min remaining
          </span>
        </div>
      )}

      {/* Simple step counter for mobile */}
      <div className="flex justify-center mt-2 sm:hidden">
        <span className="text-xs text-muted-foreground">
          Step {currentStep} of {totalSteps}
          {remainingTime !== null && remainingTime > 0 && ` • ~${remainingTime} min left`}
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
