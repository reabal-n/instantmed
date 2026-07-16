"use client"

import { AnimatePresence,motion } from "framer-motion"
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  FileText,
  Loader2,
  MessageSquare,
  Send,
  XCircle,
} from "lucide-react"

import { useReducedMotion } from "@/components/ui/motion"
import type { IntakeStatus } from "@/lib/data/intake-lifecycle"
import { cn } from "@/lib/utils"

interface IntakeStatusTrackerProps {
  initialStatus: IntakeStatus
  className?: string
}

interface StatusStep {
  id: IntakeStatus
  label: string
  description: string
  icon: React.ReactNode
}

const STATUS_STEPS: StatusStep[] = [
  {
    id: "paid",
    label: "Under review",
    description: "Your request is in the queue",
    icon: <Clock className="h-4 w-4" />,
  },
  {
    id: "in_review",
    label: "Doctor reviewing",
    description: "A doctor is looking at your request",
    icon: <FileText className="h-4 w-4" />,
  },
  {
    id: "approved",
    label: "Approved",
    description: "Your request has been approved",
    icon: <CheckCircle2 className="h-4 w-4" />,
  },
  {
    id: "completed",
    label: "Sent",
    description: "Document delivered to your email",
    icon: <Send className="h-4 w-4" />,
  },
]

const SPECIAL_STATUSES: Record<string, { label: string; description: string; icon: React.ReactNode; color: string }> = {
  pending_info: {
    label: "Info requested",
    description: "The doctor has a question for you",
    icon: <MessageSquare className="h-4 w-4" />,
    color: "text-warning bg-warning-light border-warning-border",
  },
  declined: {
    label: "Not approved",
    description: "Request couldn't be approved this time",
    icon: <XCircle className="h-4 w-4" />,
    color: "text-destructive bg-destructive-light border-destructive-border",
  },
  escalated: {
    label: "Escalated",
    description: "Requires additional review",
    icon: <AlertCircle className="h-4 w-4" />,
    // Canonical §10 severity step 3 (Elevated). Subtle, not alarming.
    color: "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800",
  },
  awaiting_script: {
    label: "Preparing script",
    description: "Your eScript is being prepared",
    icon: <FileText className="h-4 w-4" />,
    color: "text-info bg-info-light border-info-border",
  },
}

function getStatusIndex(status: IntakeStatus): number {
  const index = STATUS_STEPS.findIndex((s) => s.id === status)
  if (index === -1) {
    // Map special statuses to their approximate position
    if (status === "pending_info" || status === "escalated") return 1
    if (status === "awaiting_script") return 2
    if (status === "declined") return -1
    return 0
  }
  return index
}

export function IntakeStatusTracker({
  initialStatus,
  className,
}: IntakeStatusTrackerProps) {
  const prefersReducedMotion = useReducedMotion()
  // The shell-level authenticated poller refreshes the server projection. This
  // tracker stays controlled by that parent prop and never fabricates a browser
  // observation time as a persisted clinical transition timestamp.
  const status = initialStatus

  const currentIndex = getStatusIndex(status)
  const isSpecialStatus = status in SPECIAL_STATUSES
  const specialStatus = SPECIAL_STATUSES[status]
  const showWaitTime = status === "paid" || status === "in_review"

  return (
    <div className={cn("rounded-2xl border bg-card p-5", className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold">Request Status</h3>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span>Updates automatically</span>
        </div>
      </div>

      {/* Special status alert.
          Animate opacity + transform only (DESIGN.md §12 forbids
          animating layout properties like height). The previous
          height: 0 → "auto" violated the perf budget. */}
      <AnimatePresence>
        {isSpecialStatus && specialStatus && (
          <motion.div
            initial={prefersReducedMotion ? {} : { opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={prefersReducedMotion ? undefined : { opacity: 0, y: -6 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.18, ease: [0, 0, 0.2, 1] }}
            className={cn(
              "mb-5 p-4 rounded-xl border flex items-start gap-3",
              specialStatus.color
            )}
          >
            <div className="shrink-0 mt-0.5">{specialStatus.icon}</div>
            <div>
              <p className="font-medium text-sm">{specialStatus.label}</p>
              <p className="text-sm opacity-80">{specialStatus.description}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Estimated wait time */}
      {showWaitTime && (
        <motion.div
          initial={prefersReducedMotion ? {} : { opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-5 p-3 rounded-xl bg-info-light border border-info-border"
        >
          <div className="flex items-center gap-2 text-info">
            <Clock className="h-4 w-4" />
            <span className="text-sm font-medium">
              Your request is in the queue. Doctor review follows when available.
            </span>
          </div>
        </motion.div>
      )}

      {/* Progress steps */}
      <div className="relative">
        {/* Progress line */}
        <div className="absolute left-[15px] top-[24px] bottom-[24px] w-0.5 bg-muted" />
        <motion.div
          className="absolute left-[15px] top-[24px] w-0.5 bg-primary"
          initial={prefersReducedMotion ? {} : { height: 0 }}
          animate={{
            height: `${Math.max(0, Math.min(100, (currentIndex / (STATUS_STEPS.length - 1)) * 100))}%`,
          }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.3, ease: "easeOut" }}
        />

        {/* Steps */}
        <div className="space-y-4">
          {STATUS_STEPS.map((step, index) => {
            const isActive = index === currentIndex && !isSpecialStatus
            const isComplete = index < currentIndex || (status === "completed" && index <= currentIndex)
            const isPending = index > currentIndex

            return (
              <motion.div
                key={step.id}
                className="flex items-start gap-4"
                initial={prefersReducedMotion ? {} : { opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: prefersReducedMotion ? 0 : index * 0.1 }}
              >
                {/* Icon */}
                <div
                  className={cn(
                    "relative z-10 h-8 w-8 rounded-full flex items-center justify-center border-2 transition-[transform,box-shadow] duration-300",
                    isComplete && "bg-primary border-primary text-primary-foreground",
                    isActive && "bg-primary/10 border-primary text-primary animate-pulse",
                    isPending && "bg-muted border-muted-foreground/20 text-muted-foreground"
                  )}
                >
                  {isComplete ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : isActive ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    step.icon
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 pt-1">
                  <div className="flex items-center justify-between gap-2">
                    <p
                      className={cn(
                        "font-medium text-sm transition-colors",
                        isComplete && "text-primary",
                        isActive && "text-foreground",
                        isPending && "text-muted-foreground"
                      )}
                    >
                      {step.label}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {step.description}
                  </p>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
