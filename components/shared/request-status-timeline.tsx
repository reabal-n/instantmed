import { CheckCircle, Clock, FileText, CreditCard, UserCheck, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface TimelineStep {
  id: string
  label: string
  description: string
  status: "complete" | "current" | "upcoming" | "error"
  timestamp?: string
}

interface RequestStatusTimelineProps {
  currentStatus: string
  paymentStatus: string
  createdAt: string
  updatedAt: string
}

export function RequestStatusTimeline({
  currentStatus,
  paymentStatus,
  createdAt,
  updatedAt,
}: RequestStatusTimelineProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-AU", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getSteps = (): TimelineStep[] => {
    const steps: TimelineStep[] = [
      {
        id: "submitted",
        label: "Request Submitted",
        description: "Your questionnaire has been received",
        status: "complete",
        timestamp: formatDate(createdAt),
      },
      {
        id: "payment",
        label: "Payment",
        description: paymentStatus === "paid" ? "Payment confirmed" : "Awaiting payment",
        status: paymentStatus === "paid" ? "complete" : paymentStatus === "pending" ? "current" : "error",
        timestamp: paymentStatus === "paid" ? formatDate(updatedAt) : undefined,
      },
      {
        id: "review",
        label: "Doctor Review",
        description: currentStatus === "pending" ? "Awaiting doctor review" : "Reviewed by doctor",
        status:
          paymentStatus !== "paid"
            ? "upcoming"
            : currentStatus === "pending"
              ? "current"
              : currentStatus === "needs_follow_up"
                ? "error"
                : "complete",
        timestamp: currentStatus !== "pending" && paymentStatus === "paid" ? formatDate(updatedAt) : undefined,
      },
      {
        id: "complete",
        label: "Complete",
        description:
          currentStatus === "approved"
            ? "Document ready for download"
            : currentStatus === "declined"
              ? "Request declined"
              : "Awaiting completion",
        status: currentStatus === "approved" ? "complete" : currentStatus === "declined" ? "error" : "upcoming",
        timestamp: currentStatus === "approved" || currentStatus === "declined" ? formatDate(updatedAt) : undefined,
      },
    ]

    return steps
  }

  const steps = getSteps()

  const getIcon = (step: TimelineStep) => {
    switch (step.id) {
      case "submitted":
        return FileText
      case "payment":
        return CreditCard
      case "review":
        return UserCheck
      case "complete":
        return step.status === "error" ? AlertCircle : CheckCircle
      default:
        return Clock
    }
  }

  return (
    <div className="space-y-4">
      {steps.map((step, index) => {
        const Icon = getIcon(step)
        const isLast = index === steps.length - 1

        return (
          <div key={step.id} className="flex gap-4">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center",
                  step.status === "complete" && "bg-emerald-100 text-emerald-600",
                  step.status === "current" && "bg-dawn-100 text-dawn-600",
                  step.status === "upcoming" && "bg-muted text-muted-foreground",
                  step.status === "error" && "bg-red-100 text-red-600",
                )}
              >
                <Icon className="w-5 h-5" />
              </div>
              {!isLast && (
                <div className={cn("w-0.5 h-12 mt-2", step.status === "complete" ? "bg-emerald-200" : "bg-border")} />
              )}
            </div>
            <div className="flex-1 pb-8">
              <div className="flex items-center justify-between">
                <h4
                  className={cn(
                    "font-medium",
                    step.status === "upcoming" && "text-muted-foreground",
                    step.status === "error" && "text-red-700",
                  )}
                >
                  {step.label}
                </h4>
                {step.timestamp && <span className="text-xs text-muted-foreground">{step.timestamp}</span>}
              </div>
              <p
                className={cn(
                  "text-sm mt-0.5",
                  step.status === "upcoming" ? "text-muted-foreground/60" : "text-muted-foreground",
                )}
              >
                {step.description}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
