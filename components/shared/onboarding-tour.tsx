"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { X, ChevronRight, ChevronLeft, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"

interface TourStep {
  target: string // CSS selector
  title: string
  description: string
  position?: "top" | "bottom" | "left" | "right"
}

interface OnboardingTourProps {
  steps: TourStep[]
  tourId: string // Unique ID to track completion in localStorage
  onComplete?: () => void
  onSkip?: () => void
}

export function OnboardingTour({ steps, tourId, onComplete, onSkip }: OnboardingTourProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [isVisible, setIsVisible] = useState(false)
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null)

  // Check if tour was already completed
  useEffect(() => {
    const completed = localStorage.getItem(`tour_${tourId}_completed`)
    if (!completed) {
      // Delay showing tour to let page render
      const timer = setTimeout(() => setIsVisible(true), 1000)
      return () => clearTimeout(timer)
    }
  }, [tourId])

  // Update target element position
  const updateTargetPosition = useCallback(() => {
    if (!isVisible || currentStep >= steps.length) return
    
    const target = document.querySelector(steps[currentStep].target)
    if (target) {
      const rect = target.getBoundingClientRect()
      setTargetRect(rect)
      
      // Scroll target into view if needed
      target.scrollIntoView({ behavior: "smooth", block: "center" })
    }
  }, [currentStep, steps, isVisible])

  useEffect(() => {
    // Use requestAnimationFrame to avoid synchronous setState in effect
    const rafId = requestAnimationFrame(() => {
      updateTargetPosition()
    })
    
    window.addEventListener("resize", updateTargetPosition)
    window.addEventListener("scroll", updateTargetPosition)
    
    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener("resize", updateTargetPosition)
      window.removeEventListener("scroll", updateTargetPosition)
    }
  }, [updateTargetPosition])

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      handleComplete()
    }
  }

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleComplete = () => {
    localStorage.setItem(`tour_${tourId}_completed`, "true")
    setIsVisible(false)
    onComplete?.()
  }

  const handleSkip = () => {
    localStorage.setItem(`tour_${tourId}_completed`, "true")
    setIsVisible(false)
    onSkip?.()
  }

  if (!isVisible || !targetRect) return null

  const step = steps[currentStep]
  const isLastStep = currentStep === steps.length - 1

  // Calculate tooltip position
  const getTooltipStyle = () => {
    const padding = 16
    const tooltipWidth = 320
    const tooltipHeight = 180
    
    let top = 0
    let left = 0
    
    switch (step.position || "bottom") {
      case "top":
        top = targetRect.top - tooltipHeight - padding
        left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2
        break
      case "bottom":
        top = targetRect.bottom + padding
        left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2
        break
      case "left":
        top = targetRect.top + targetRect.height / 2 - tooltipHeight / 2
        left = targetRect.left - tooltipWidth - padding
        break
      case "right":
        top = targetRect.top + targetRect.height / 2 - tooltipHeight / 2
        left = targetRect.right + padding
        break
    }
    
    // Keep tooltip in viewport
    left = Math.max(padding, Math.min(left, window.innerWidth - tooltipWidth - padding))
    top = Math.max(padding, Math.min(top, window.innerHeight - tooltipHeight - padding))
    
    return { top, left, width: tooltipWidth }
  }

  const tooltipStyle = getTooltipStyle()

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/50 z-[100] transition-opacity"
        onClick={handleSkip}
      />
      
      {/* Spotlight on target */}
      <div
        className="fixed z-[101] rounded-xl ring-4 ring-primary/50 ring-offset-4 ring-offset-transparent pointer-events-none transition-all duration-300"
        style={{
          top: targetRect.top - 8,
          left: targetRect.left - 8,
          width: targetRect.width + 16,
          height: targetRect.height + 16,
          boxShadow: "0 0 0 9999px rgba(0,0,0,0.5)",
        }}
      />
      
      {/* Tooltip */}
      <div
        className="fixed z-[102] bg-white/95 dark:bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl p-5 animate-fade-in-up"
        style={tooltipStyle}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">
                Step {currentStep + 1} of {steps.length}
              </p>
              <h3 className="font-semibold text-foreground">{step.title}</h3>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSkip}
            className="h-8 w-8 p-0 rounded-lg"
          >
            <X className="w-4 h-4" />
            <span className="sr-only">Skip tour</span>
          </Button>
        </div>
        
        {/* Description */}
        <p className="text-sm text-muted-foreground mb-4">{step.description}</p>
        
        {/* Progress dots */}
        <div className="flex items-center justify-center gap-1.5 mb-4">
          {steps.map((_, index) => (
            <div
              key={index}
              className={cn(
                "w-2 h-2 rounded-full transition-colors",
                index === currentStep ? "bg-primary" : "bg-muted"
              )}
            />
          ))}
        </div>
        
        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={handlePrev}
            disabled={currentStep === 0}
            className="rounded-lg"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
          <Button
            size="sm"
            onClick={handleNext}
            className="rounded-lg"
          >
            {isLastStep ? "Get Started" : "Next"}
            {!isLastStep && <ChevronRight className="w-4 h-4 ml-1" />}
          </Button>
        </div>
      </div>
    </>
  )
}

// Pre-defined tour configurations
export const patientDashboardTour: TourStep[] = [
  {
    target: "[data-tour='quick-actions']",
    title: "Quick Actions",
    description: "Start a new medical certificate or prescription request with just one click.",
    position: "bottom",
  },
  {
    target: "[data-tour='recent-requests']",
    title: "Your Requests",
    description: "Track all your requests here. Click any request to see its status and download documents.",
    position: "top",
  },
  {
    target: "[data-tour='nav-settings']",
    title: "Account Settings",
    description: "Update your profile, Medicare details, and notification preferences.",
    position: "bottom",
  },
]

export const doctorDashboardTour: TourStep[] = [
  {
    target: "[data-tour='pending-queue']",
    title: "Pending Queue",
    description: "Requests waiting for your review appear here. Click to review and approve.",
    position: "bottom",
  },
  {
    target: "[data-tour='quick-approve']",
    title: "Quick Actions",
    description: "Use these buttons to quickly approve or decline straightforward requests.",
    position: "left",
  },
  {
    target: "[data-tour='search']",
    title: "Search",
    description: "Press ⌘K to quickly search for patients or requests.",
    position: "bottom",
  },
]
