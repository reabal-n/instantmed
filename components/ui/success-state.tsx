"use client"

import { CheckCircle, Clock } from "lucide-react"
import { Button } from "./button"
import { cn } from "@/lib/utils"
import { useEffect } from "react"
import confetti from "canvas-confetti"

interface SuccessStateProps {
  title: string
  description: string
  timelineInfo?: {
    icon?: React.ComponentType<{ className?: string }>
    text: string
  }
  actions?: {
    primary?: {
      label: string
      onClick: () => void
    }
    secondary?: {
      label: string
      onClick: () => void
    }
  }
  showConfetti?: boolean
  className?: string
}

export function SuccessState({
  title,
  description,
  timelineInfo,
  actions,
  showConfetti = true,
  className,
}: SuccessStateProps) {
  const TimelineIcon = timelineInfo?.icon || Clock

  useEffect(() => {
    if (showConfetti) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { x: 0.5, y: 0.6 },
        colors: ["#2563EB", "#06B6D4", "#8B5CF6", "#F59E0B", "#10B981"],
      })
    }
  }, [showConfetti])

  return (
    <div className={cn("text-center py-12 px-4 animate-in fade-in slide-in-from-bottom-4 duration-500", className)}>
      {/* Animated success icon */}
      <div className="relative w-20 h-20 mx-auto mb-6">
        <div className="absolute inset-0 rounded-full bg-green-100 animate-in zoom-in duration-300" />
        <div className="absolute inset-0 flex items-center justify-center animate-in zoom-in duration-500 delay-100">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>
      </div>

      {/* Title and description */}
      <h2 className="text-2xl font-bold mb-2 animate-in fade-in slide-in-from-bottom-2 duration-500 delay-150">
        {title}
      </h2>
      <p className="text-muted-foreground mb-6 max-w-md mx-auto animate-in fade-in slide-in-from-bottom-2 duration-500 delay-200">
        {description}
      </p>

      {/* Timeline info */}
      {timelineInfo && (
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 text-sm text-primary mb-8 animate-in fade-in slide-in-from-bottom-2 duration-500 delay-300">
          <TimelineIcon className="w-4 h-4" />
          <span>{timelineInfo.text}</span>
        </div>
      )}

      {/* Actions */}
      {actions && (
        <div className="space-y-2 max-w-sm mx-auto animate-in fade-in slide-in-from-bottom-2 duration-500 delay-400">
          {actions.primary && (
            <Button 
              onClick={actions.primary.onClick} 
              className="w-full h-12 bg-primary hover:bg-primary/90"
            >
              {actions.primary.label}
            </Button>
          )}
          {actions.secondary && (
            <Button
              onClick={actions.secondary.onClick}
              variant="ghost"
              className="w-full h-12"
            >
              {actions.secondary.label}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
