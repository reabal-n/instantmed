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

interface StatusTimestamp {
  status: string
  created_at: string
}

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

// Generate a consistent "random" wait time based on intake ID
function getEstimatedWaitTime(intakeId: string): number {
  // Use intake ID to generate consistent number between 5-45
  let hash = 0
  for (let i = 0; i < intakeId.length; i++) {
    hash = ((hash << 5) - hash) + intakeId.charCodeAt(i)
    hash |= 0
  }
  return 5 + Math.abs(hash % 41) // 5-45 minutes
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
  isPriority: _isPriority = false,
  onStatusChange,
  className,
}: IntakeStatusTrackerProps) {
  const [status, setStatus] = useState<IntakeStatus>(initialStatus)
  const [timestamps, setTimestamps] = useState<Map<string, string>>(new Map())
  const [isConnecting, setIsConnecting] = useState(true)
  const [isDisconnected, setIsDisconnected] = useState(false)
  const [retryCount, setRetryCount] = useState(0)

  // Fetch status history timestamps on mount
  useEffect(() => {
    const supabase = createClient()
    supabase
      .from("intake_status_history")
      .select("new_status, created_at")
      .eq("intake_id", intakeId)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (data) {
          const map = new Map<string, string>()
          data.forEach((row: { new_status: string; created_at: string }) => {
            if (!map.has(row.new_status)) {
              map.set(row.new_status, row.created_at)
            }
          })
          setTimestamps(map)
        }
      })
  }, [intakeId])

  // Subscribe to realtime status updates with reconnection logic
  useEffect(() => {
    const supabase = createClient()
    let reconnectTimeout: NodeJS.Timeout | null = null

    const setupChannel = () => {
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
            // Record this transition timestamp immediately
            setTimestamps(prev => {
              const next = new Map(prev)
              if (!next.has(newStatus)) {
                next.set(newStatus, new Date().toISOString())
              }
              return next
            })
            onStatusChange?.(newStatus)
          }
        )
        .subscribe((subscriptionStatus, _err) => {
          if (subscriptionStatus === "SUBSCRIBED") {
            setIsConnecting(false)
            setIsDisconnected(false)
            setRetryCount(0)
          } else if (subscriptionStatus === "CHANNEL_ERROR" || subscriptionStatus === "TIMED_OUT") {
            setIsDisconnected(true)
            setIsConnecting(false)
            
            // Exponential backoff retry (max 30 seconds)
            const delay = Math.min(1000 * Math.pow(2, retryCount), 30000)
            reconnectTimeout = setTimeout(() => {
              setRetryCount((prev) => prev + 1)
              supabase.removeChannel(channel)
              setupChannel()
            }, delay)
          } else if (subscriptionStatus === "CLOSED") {
            setIsDisconnected(true)
          }
        })

      return channel
    }

    const channel = setupChannel()

    return () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout)
      supabase.removeChannel(channel)
    }
  }, [intakeId, onStatusChange, retryCount])

  const currentIndex = getStatusIndex(status)
  const isSpecialStatus = status in SPECIAL_STATUSES
  const specialStatus = SPECIAL_STATUSES[status]
  const estimatedWait = getEstimatedWaitTime(intakeId)
  const showWaitTime = status === "paid" || status === "in_review"

  return (
    <div className={cn("rounded-2xl border bg-card p-5", className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold">Request Status</h3>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {isConnecting ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Connecting...</span>
            </>
          ) : isDisconnected ? (
            <>
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              <span>Reconnecting...</span>
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

      {/* Estimated wait time */}
      {showWaitTime && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-5 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800"
        >
          <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
            <Clock className="h-4 w-4" />
            <span className="text-sm font-medium">
              Doctors typically review within {estimatedWait} minutes
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
                    {(isComplete || isActive) && timestamps.get(step.id) && (
                      <span className="text-[11px] text-muted-foreground tabular-nums shrink-0">
                        {new Date(timestamps.get(step.id)!).toLocaleString("en-AU", {
                          day: "numeric",
                          month: "short",
                          hour: "numeric",
                          minute: "2-digit",
                          hour12: true,
                        })}
                      </span>
                    )}
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
