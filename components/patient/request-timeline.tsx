"use client"

import { cn } from "@/lib/utils"
import { Check, CreditCard, Clock, FileCheck, XCircle } from "lucide-react"

export type TimelineStatus = "submitted" | "paid" | "in_review" | "approved" | "declined" | "needs_info"

interface TimelineStep {
  id: TimelineStatus
  label: string
  description?: string
  icon: React.ElementType
  completedAt?: string
}

interface RequestTimelineProps {
  currentStatus: string
  paymentStatus?: string
  createdAt?: string
  paidAt?: string
  reviewedAt?: string
  className?: string
}

const TIMELINE_STEPS: TimelineStep[] = [
  { id: "submitted", label: "Submitted", icon: FileCheck },
  { id: "paid", label: "Paid", icon: CreditCard },
  { id: "in_review", label: "Under Review", icon: Clock },
  { id: "approved", label: "Approved", icon: Check },
]

function getTimelineState(currentStatus: string, paymentStatus?: string): {
  completedSteps: TimelineStatus[]
  activeStep: TimelineStatus | null
  isFailed: boolean
  failedStep?: TimelineStatus
} {
  const completedSteps: TimelineStatus[] = ["submitted"]
  let activeStep: TimelineStatus | null = null
  let isFailed = false
  let failedStep: TimelineStatus | undefined

  // Check payment status
  if (paymentStatus === "paid") {
    completedSteps.push("paid")
  } else if (paymentStatus === "pending_payment") {
    activeStep = "paid"
    return { completedSteps, activeStep, isFailed, failedStep }
  }

  // Check request status
  if (currentStatus === "pending") {
    activeStep = "in_review"
  } else if (currentStatus === "approved") {
    completedSteps.push("in_review", "approved")
  } else if (currentStatus === "declined") {
    completedSteps.push("in_review")
    isFailed = true
    failedStep = "approved"
  } else if (currentStatus === "needs_follow_up") {
    completedSteps.push("in_review")
    activeStep = "in_review"
  }

  return { completedSteps, activeStep, isFailed, failedStep }
}

export function RequestTimeline({
  currentStatus,
  paymentStatus,
  createdAt,
  paidAt,
  reviewedAt,
  className,
}: RequestTimelineProps) {
  const { completedSteps, activeStep, isFailed, failedStep } = getTimelineState(currentStatus, paymentStatus)

  const formatDate = (dateString?: string) => {
    if (!dateString) return null
    return new Date(dateString).toLocaleDateString("en-AU", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getStepDate = (stepId: TimelineStatus): string | null => {
    switch (stepId) {
      case "submitted":
        return formatDate(createdAt)
      case "paid":
        return formatDate(paidAt)
      case "approved":
      case "in_review":
        return formatDate(reviewedAt)
      default:
        return null
    }
  }

  return (
    <div className={cn("relative", className)}>
      <div className="flex items-start justify-between">
        {TIMELINE_STEPS.map((step, index) => {
          const isCompleted = completedSteps.includes(step.id)
          const isActive = activeStep === step.id
          const isFail = isFailed && failedStep === step.id
          const stepDate = getStepDate(step.id)
          const Icon = isFail ? XCircle : step.icon

          return (
            <div key={step.id} className="flex flex-col items-center flex-1">
              {/* Connector line */}
              {index > 0 && (
                <div
                  className={cn(
                    "absolute h-0.5 top-4 -translate-y-1/2",
                    isCompleted || isActive ? "bg-primary" : "bg-muted"
                  )}
                  style={{
                    left: `calc(${((index - 1) / (TIMELINE_STEPS.length - 1)) * 100}% + 1rem)`,
                    width: `calc(${(1 / (TIMELINE_STEPS.length - 1)) * 100}% - 2rem)`,
                  }}
                />
              )}

              {/* Step circle */}
              <div
                className={cn(
                  "relative z-10 w-8 h-8 rounded-full flex items-center justify-center transition-all",
                  isCompleted && "bg-primary text-primary-foreground",
                  isActive && "bg-primary/20 text-primary border-2 border-primary",
                  isFail && "bg-red-500 text-white",
                  !isCompleted && !isActive && !isFail && "bg-muted text-muted-foreground"
                )}
              >
                <Icon className="w-4 h-4" />
              </div>

              {/* Label */}
              <span
                className={cn(
                  "text-xs mt-2 text-center font-medium",
                  isCompleted || isActive ? "text-foreground" : "text-muted-foreground",
                  isFail && "text-red-600"
                )}
              >
                {isFail ? "Declined" : step.label}
              </span>

              {/* Date */}
              {stepDate && isCompleted && (
                <span className="text-[10px] text-muted-foreground mt-0.5">{stepDate}</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

interface CompactTimelineProps {
  currentStatus: string
  paymentStatus?: string
  className?: string
}

export function CompactTimeline({ currentStatus, paymentStatus, className }: CompactTimelineProps) {
  const { completedSteps, activeStep, isFailed } = getTimelineState(currentStatus, paymentStatus)
  const totalSteps = TIMELINE_STEPS.length
  const completedCount = completedSteps.length
  const progress = (completedCount / totalSteps) * 100

  const getStatusText = () => {
    if (paymentStatus === "pending_payment") return "Awaiting payment"
    if (currentStatus === "pending") return "Under doctor review"
    if (currentStatus === "approved") return "Complete"
    if (currentStatus === "declined") return "Unable to approve"
    if (currentStatus === "needs_follow_up") return "More info needed"
    return "Processing"
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-foreground">{getStatusText()}</span>
        <span className="text-muted-foreground">
          {completedCount}/{totalSteps} steps
        </span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            isFailed ? "bg-red-500" : "bg-primary"
          )}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}
