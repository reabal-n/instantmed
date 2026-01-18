"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Clock, 
  CheckCircle2, 
  MessageSquare, 
  FileText, 
  Send,
  AlertCircle,
  XCircle,
  Loader2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import type { IntakeStatus } from "@/lib/data/intake-lifecycle"

interface IntakeStatusTrackerProps {
  intakeId: string
  initialStatus: IntakeStatus
  isPriority?: boolean
  onStatusChange?: (newStatus: IntakeStatus) => void
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
    color: "text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-950/40 dark:border-amber-800",
  },
  declined: {
    label: "Not approved",
    description: "Request couldn't be approved this time",
    icon: <XCircle className="h-4 w-4" />,
    color: "text-red-700 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-950/40 dark:border-red-800",
  },
  escalated: {
    label: "Escalated",
    description: "Requires additional review",
    icon: <AlertCircle className="h-4 w-4" />,
    color: "text-orange-700 bg-orange-50 border-orange-200 dark:text-orange-400 dark:bg-orange-950/40 dark:border-orange-800",
  },
  awaiting_script: {
    label: "Preparing script",
    description: "Your eScript is being prepared",
    icon: <FileText className="h-4 w-4" />,
    color: "text-blue-700 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-950/40 dark:border-blue-800",
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
  intakeId,
  initialStatus,
  isPriority = false,
  onStatusChange,
  className,
}: IntakeStatusTrackerProps) {
  const [status, setStatus] = useState<IntakeStatus>(initialStatus)
  const [isConnecting, setIsConnecting] = useState(true)

  // Subscribe to realtime status updates
  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel(`intake-status-${intakeId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "intakes",
          filter: `id=eq.${intakeId}`,
        },
        (payload) => {
          const newStatus = payload.new.status as IntakeStatus
          setStatus(newStatus)
          onStatusChange?.(newStatus)
        }
      )
      .subscribe((status) => {
        setIsConnecting(status !== "SUBSCRIBED")
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [intakeId, onStatusChange])

  const currentIndex = getStatusIndex(status)
  const isSpecialStatus = status in SPECIAL_STATUSES
  const specialStatus = SPECIAL_STATUSES[status]

  return (
    <div className={cn("rounded-2xl border bg-card p-5", className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold">Request Status</h3>
          {isPriority && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
              Priority
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {isConnecting ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Connecting...</span>
            </>
          ) : (
            <>
              <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
              <span>Live</span>
            </>
          )}
        </div>
      </div>

      {/* Special status alert */}
      <AnimatePresence>
        {isSpecialStatus && specialStatus && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
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

      {/* Progress steps */}
      <div className="relative">
        {/* Progress line */}
        <div className="absolute left-[15px] top-[24px] bottom-[24px] w-0.5 bg-muted" />
        <motion.div
          className="absolute left-[15px] top-[24px] w-0.5 bg-primary"
          initial={{ height: 0 }}
          animate={{
            height: `${Math.max(0, Math.min(100, (currentIndex / (STATUS_STEPS.length - 1)) * 100))}%`,
          }}
          transition={{ duration: 0.5, ease: "easeOut" }}
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
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                {/* Icon */}
                <div
                  className={cn(
                    "relative z-10 h-8 w-8 rounded-full flex items-center justify-center border-2 transition-all duration-300",
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
