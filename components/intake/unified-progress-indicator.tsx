"use client"

import React from "react"
import { motion } from "framer-motion"
import { CircleCheck } from "lucide-react"
import { cn } from "@/lib/utils"

interface UnifiedProgressIndicatorProps {
  currentStep: number
  totalSteps: number
  onContinue: () => void
  onBack?: () => void
  isExpanded?: boolean
  isLastStep?: boolean
  disabled?: boolean
  continueLabel?: string
  backLabel?: string
  className?: string
}

export function UnifiedProgressIndicator({
  currentStep,
  totalSteps,
  onContinue,
  onBack,
  isExpanded = true,
  isLastStep = false,
  disabled = false,
  continueLabel,
  backLabel = "Back",
  className,
}: UnifiedProgressIndicatorProps) {
  const steps = Array.from({ length: totalSteps }, (_, i) => i + 1)
  const progressWidth = currentStep === 1 ? 24 : currentStep === 2 ? 60 : 96

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

        {/* Animated progress overlay */}
        <motion.div
          initial={{ width: "12px" }}
          animate={{ width: `${progressWidth}px` }}
          className="absolute -left-[8px] -top-[8px] -translate-y-1/2 h-3 bg-linear-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full"
          transition={{ duration: 0.2, ease: "easeOut" }}
        />
      </div>

      {/* Buttons container */}
      <div className="w-full max-w-sm">
        <motion.div
          className="flex items-center gap-1"
          animate={{
            justifyContent: isExpanded ? "stretch" : "space-between",
          }}
        >
          {!isExpanded && onBack && (
            <motion.button
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "64px" }}
              transition={{ duration: 0.15, ease: "easeOut" }}
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
              flex: isExpanded ? 1 : "inherit",
            }}
            className={cn(
              "px-4 py-3 rounded-full text-white bg-linear-to-r from-blue-500 via-purple-500 to-pink-500 transition-opacity duration-150 flex-1 w-56 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]",
              !isExpanded && "w-44"
            )}
          >
            <div className="flex items-center font-semibold justify-center gap-2 text-sm">
              {isLastStep && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.15 }}
                >
                  <CircleCheck size={16} />
                </motion.div>
              )}
              {continueLabel || (isLastStep ? "Finish" : "Continue")}
            </div>
          </motion.button>
        </motion.div>
      </div>
    </div>
  )
}

