"use client"

import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"
import { cn } from "@/lib/utils"

interface ProgressProps extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> {
  value?: number
  variant?: "default" | "gradient" | "success" | "warning"
  size?: "sm" | "md" | "lg"
  showLabel?: boolean
  animated?: boolean
}

const Progress = React.forwardRef<React.ElementRef<typeof ProgressPrimitive.Root>, ProgressProps>(
  ({ className, value = 0, variant = "default", size = "md", showLabel, animated = true, ...props }, ref) => {
    const sizeClasses = {
      sm: "h-1.5",
      md: "h-2.5",
      lg: "h-4",
    }

    const variantClasses = {
      default: "bg-primary",
      gradient: "bg-gradient-to-r from-[#00E2B5] to-[#06B6D4]",
      success: "bg-green-500",
      warning: "bg-amber-500",
    }

    return (
      <div className="relative">
        <ProgressPrimitive.Root
          ref={ref}
          className={cn("relative w-full overflow-hidden rounded-full bg-muted", sizeClasses[size], className)}
          {...props}
        >
          <ProgressPrimitive.Indicator
            className={cn(
              "h-full w-full flex-1 rounded-full transition-all duration-500 ease-out",
              variantClasses[variant],
              animated && "animate-pulse-soft"
            )}
            style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
          />
        </ProgressPrimitive.Root>
        {showLabel && (
          <span className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-full ml-2 text-xs font-medium text-muted-foreground">
            {Math.round(value || 0)}%
          </span>
        )}
      </div>
    )
  }
)
Progress.displayName = ProgressPrimitive.Root.displayName

// Step progress indicator for multi-step forms
interface StepProgressProps {
  steps: string[]
  currentStep: number
  className?: string
}

function StepProgress({ steps, currentStep, className }: StepProgressProps) {
  return (
    <div className={cn("w-full", className)}>
      {/* Progress bar */}
      <div className="relative h-1 bg-muted rounded-full mb-4 overflow-hidden">
        <div
          className="absolute h-full bg-gradient-to-r from-[#00E2B5] to-[#06B6D4] rounded-full transition-all duration-500 ease-out"
          style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
        />
      </div>

      {/* Step indicators */}
      <div className="flex justify-between">
        {steps.map((step, index) => (
          <div key={step} className="flex flex-col items-center">
            <div
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-all duration-300",
                index < currentStep && "bg-[#00E2B5] text-[#0A0F1C]",
                index === currentStep && "bg-[#00E2B5] text-[#0A0F1C] ring-4 ring-[#00E2B5]/20",
                index > currentStep && "bg-muted text-muted-foreground"
              )}
            >
              {index < currentStep ? (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                index + 1
              )}
            </div>
            <span
              className={cn(
                "mt-2 text-xs font-medium transition-colors",
                index <= currentStep ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {step}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// Circular progress indicator
interface CircularProgressProps {
  value: number
  size?: number
  strokeWidth?: number
  className?: string
  showValue?: boolean
  label?: string
}

function CircularProgress({
  value,
  size = 120,
  strokeWidth = 8,
  className,
  showValue = true,
  label,
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (value / 100) * circumference

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#gradient)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-500 ease-out"
        />
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#00E2B5" />
            <stop offset="100%" stopColor="#06B6D4" />
          </linearGradient>
        </defs>
      </svg>
      {showValue && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold">{Math.round(value)}%</span>
          {label && <span className="text-xs text-muted-foreground">{label}</span>}
        </div>
      )}
    </div>
  )
}

export { Progress, StepProgress, CircularProgress }
