"use client"

import React from 'react'
import { motion } from 'framer-motion'
import { CircleCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ProgressIndicatorProps {
  currentStep?: number
  totalSteps?: number
  onContinue?: () => void
  onBack?: () => void
  isExpanded?: boolean
  isLastStep?: boolean
  disabled?: boolean
  continueLabel?: string
  backLabel?: string
  className?: string
}

export function ProgressIndicator({
  currentStep = 1,
  totalSteps = 3,
  onContinue,
  onBack,
  isExpanded = true,
  isLastStep = false,
  disabled = false,
  continueLabel,
  backLabel = "Back",
  className,
}: ProgressIndicatorProps) {
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
    <div className={cn("flex flex-col items-center justify-center gap-8", className)}>
      {/* Progress dots */}
      <div className="flex items-center gap-6 relative">
        {steps.map((step) => (
          <div
            key={step}
            className={cn(
              "w-2 h-2 rounded-full relative z-10 transition-colors duration-300",
              step <= currentStep ? "bg-white" : "bg-gray-300"
            )}
          />
        ))}

        {/* Green progress overlay */}
        <motion.div
          initial={{ width: '12px', height: "24px", x: 0 }}
          animate={{
            width: `${progressWidth}px`,
            x: 0
          }}
          className="absolute -left-[8px] -top-[8px] -translate-y-1/2 h-3 bg-green-500 rounded-full"
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

      {/* Buttons container */}
      {onContinue && (
        <div className="w-full max-w-sm">
          <motion.div
            className="flex items-center gap-1"
            animate={{
              justifyContent: isExpanded ? 'stretch' : 'space-between'
            }}
          >
            {!isExpanded && onBack && (
              <motion.button
                initial={{ opacity: 0, width: 0, scale: 0.8 }}
                animate={{ opacity: 1, width: "64px", scale: 1 }}
                transition={{
                  type: "spring",
                  stiffness: 200,
                  damping: 15,
                  mass: 0.8,
                  bounce: 0.25,
                  duration: 0.6,
                  opacity: { duration: 0.2 }
                }}
                onClick={onBack}
                className="px-4 py-3 text-black flex items-center justify-center bg-gray-100 font-semibold rounded-full hover:bg-gray-50 hover:border transition-colors flex-1 w-16 text-sm"
              >
                {backLabel}
              </motion.button>
            )}
            <motion.button
              onClick={onContinue}
              disabled={disabled}
              animate={{
                flex: isExpanded ? 1 : 'inherit',
              }}
              className={cn(
                "px-4 py-3 rounded-full text-white bg-[#006cff] transition-colors flex-1 w-56 disabled:opacity-50 disabled:cursor-not-allowed",
                !isExpanded && 'w-44'
              )}
            >
              <div className="flex items-center font-[600] justify-center gap-2 text-sm">
                {isLastStep && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{
                      type: "spring",
                      stiffness: 500,
                      damping: 15,
                      mass: 0.5,
                      bounce: 0.4
                    }}
                  >
                    <CircleCheck size={16} />
                  </motion.div>
                )}
                {continueLabel || (isLastStep ? 'Finish' : 'Continue')}
              </div>
            </motion.button>
          </motion.div>
        </div>
      )}
    </div>
  )
}

export default ProgressIndicator
