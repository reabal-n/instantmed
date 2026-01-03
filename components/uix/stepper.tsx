"use client"

import * as React from "react"
import { Progress } from "@heroui/react"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * UIX Stepper - Modern step progress component using HeroUI Progress
 * Built-in smooth animations without Framer Motion
 */

export interface Step {
  id: string
  title: string
  description?: string
}

export interface StepperProps {
  steps: Step[]
  currentStep: number
  className?: string
  orientation?: "horizontal" | "vertical"
  showLabels?: boolean
}

export function Stepper({
  steps,
  currentStep,
  className,
  orientation = "horizontal",
  showLabels = true,
}: StepperProps) {
  const progress = steps.length > 1 
    ? (currentStep / (steps.length - 1)) * 100 
    : 100

  if (orientation === "vertical") {
    return (
      <div className={cn("flex flex-col gap-2", className)}>
        {steps.map((step, index) => {
          const isCompleted = index < currentStep
          const isCurrent = index === currentStep
          const isPending = index > currentStep

          return (
            <div key={step.id} className="flex gap-3">
              {/* Step indicator */}
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-all duration-300",
                    isCompleted && "bg-primary text-primary-foreground",
                    isCurrent && "bg-primary text-primary-foreground ring-4 ring-primary/20",
                    isPending && "bg-default-100 border border-default-200 text-muted-foreground"
                  )}
                >
                  {isCompleted ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={cn(
                      "w-0.5 flex-1 min-h-[24px] transition-colors duration-300",
                      isCompleted ? "bg-primary" : "bg-default-200"
                    )}
                  />
                )}
              </div>

              {/* Step content */}
              {showLabels && (
                <div className="pb-6">
                  <p
                    className={cn(
                      "text-sm font-medium transition-colors duration-200",
                      isCurrent ? "text-foreground" : "text-muted-foreground"
                    )}
                  >
                    {step.title}
                  </p>
                  {step.description && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {step.description}
                    </p>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  // Horizontal orientation (default)
  return (
    <div className={cn("w-full", className)}>
      {/* Desktop: Full step indicators */}
      <div className="hidden md:block">
        <div className="relative flex items-start justify-between">
          {/* Background line */}
          <div className="absolute top-4 left-4 right-4 h-0.5 bg-default-200" />
          
          {/* Animated progress line */}
          <div
            className="absolute top-4 left-4 h-0.5 bg-primary rounded-full transition-all duration-500 ease-out"
            style={{ width: `calc(${progress}% - 16px)` }}
          />

          {steps.map((step, index) => {
            const isCompleted = index < currentStep
            const isCurrent = index === currentStep
            const isPending = index > currentStep

            return (
              <div
                key={step.id}
                className="flex flex-col items-center relative z-10 flex-1"
              >
                {/* Step circle */}
                <div
                  className={cn(
                    "flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-all duration-300",
                    isCompleted && "bg-primary text-primary-foreground",
                    isCurrent && "bg-primary text-primary-foreground ring-4 ring-primary/20 scale-110",
                    isPending && "bg-background border-2 border-default-200 text-muted-foreground"
                  )}
                >
                  {isCompleted ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </div>

                {/* Step label */}
                {showLabels && (
                  <div className="mt-2 text-center">
                    <span
                      className={cn(
                        "text-xs font-medium transition-colors block",
                        isCurrent ? "text-foreground" : "text-muted-foreground"
                      )}
                    >
                      {step.title}
                    </span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Mobile: Compact progress bar */}
      <div className="md:hidden">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-semibold">
              {currentStep + 1}
            </div>
            <span className="text-sm font-medium text-foreground">
              {steps[currentStep]?.title}
            </span>
          </div>
          <span className="text-xs text-muted-foreground">
            {currentStep + 1} of {steps.length}
          </span>
        </div>

        {/* HeroUI Progress component */}
        <Progress
          value={((currentStep + 1) / steps.length) * 100}
          color="primary"
          size="sm"
          radius="full"
          classNames={{
            base: "max-w-full",
            track: "bg-default-100",
            indicator: "bg-primary",
          }}
        />

        {/* Step dots */}
        <div className="flex justify-between mt-2 px-0.5">
          {steps.map((_, index) => (
            <div
              key={index}
              className={cn(
                "w-1.5 h-1.5 rounded-full transition-all duration-300",
                index <= currentStep ? "bg-primary" : "bg-default-200",
                index === currentStep && "scale-150"
              )}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

/**
 * Compact stepper for inline use
 */
export interface CompactStepperProps {
  total: number
  current: number
  className?: string
}

export function CompactStepper({ total, current, className }: CompactStepperProps) {
  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      {Array.from({ length: total }).map((_, index) => (
        <div
          key={index}
          className={cn(
            "h-1 rounded-full transition-all duration-300",
            index === current 
              ? "w-6 bg-primary" 
              : index < current 
                ? "w-1.5 bg-primary/60" 
                : "w-1.5 bg-default-200"
          )}
        />
      ))}
    </div>
  )
}

export { Stepper as UIXStepper, CompactStepper as UIXCompactStepper }
