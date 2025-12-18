"use client"

import React from 'react'
import { motion } from 'framer-motion'
import { CircleCheck, ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ProgressIndicatorProps {
  currentStep: number
  totalSteps: number
  onContinue: () => void
  onBack?: () => void
  isLoading?: boolean
  continueLabel?: string
  finishLabel?: string
  showBackOnFirstStep?: boolean
  className?: string
}

export function ProgressIndicator({
  currentStep,
  totalSteps,
  onContinue,
  onBack,
  isLoading = false,
  continueLabel = "Continue",
  finishLabel = "Submit",
  showBackOnFirstStep = false,
  className,
}: ProgressIndicatorProps) {
  const isFirstStep = currentStep === 1
  const isLastStep = currentStep === totalSteps
  const showBack = onBack && (showBackOnFirstStep || !isFirstStep)

  return (
    <div className={cn("flex flex-col items-center gap-6", className)}>
      {/* Progress dots */}
      <div className="flex items-center gap-4 relative">
        {Array.from({ length: totalSteps }, (_, i) => i + 1).map((dot) => (
          <div
            key={dot}
            className={cn(
              "w-2 h-2 rounded-full relative z-10 transition-colors duration-300",
              dot <= currentStep ? "bg-primary" : "bg-muted-foreground/30"
            )}
          />
        ))}

        {/* Animated progress overlay */}
        <motion.div
          initial={{ width: '16px' }}
          animate={{
            width: `${16 + (currentStep - 1) * 24}px`,
          }}
          className="absolute -left-1 top-1/2 -translate-y-1/2 h-4 bg-primary/20 rounded-full -z-0"
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 25,
            mass: 0.8,
          }}
        />
      </div>

      {/* Step counter */}
      <p className="text-xs text-muted-foreground">
        Step {currentStep} of {totalSteps}
      </p>

      {/* Buttons */}
      <div className="w-full flex items-center gap-3">
        {showBack && (
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{
              type: "spring",
              stiffness: 400,
              damping: 20,
            }}
            onClick={onBack}
            disabled={isLoading}
            className={cn(
              "flex items-center justify-center gap-2 px-5 py-3 rounded-full",
              "bg-muted hover:bg-muted/80 text-foreground font-medium text-sm",
              "transition-colors duration-200",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </motion.button>
        )}

        <motion.button
          onClick={onContinue}
          disabled={isLoading}
          animate={{
            flex: showBack ? 1 : 'auto',
          }}
          className={cn(
            "flex items-center justify-center gap-2 px-8 py-3 rounded-full",
            "bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm",
            "transition-all duration-200",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            !showBack && "w-full"
          )}
        >
          {isLastStep && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{
                type: "spring",
                stiffness: 500,
                damping: 15,
              }}
            >
              <CircleCheck className="h-4 w-4" />
            </motion.div>
          )}
          {isLoading ? "Processing..." : isLastStep ? finishLabel : continueLabel}
        </motion.button>
      </div>
    </div>
  )
}

export default ProgressIndicator
