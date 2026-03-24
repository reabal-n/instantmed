"use client"

import { useEffect, useState, useMemo } from "react"
import { motion, AnimatePresence, useReducedMotion } from "framer-motion"
import {
  Clock,
  CheckCircle2,
  FileText,
  Send,
  AlertCircle,
  XCircle,
  Loader2,
  MessageSquare,
} from "@/lib/icons"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import type { IntakeStatus } from "@/lib/data/intake-lifecycle"

interface IntakeStatusTrackerProps {
  intakeId: string
  initialStatus: IntakeStatus
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
  onStatusChange,
  className,
}: IntakeStatusTrackerProps) {
  const prefersReducedMotion = useReducedMotion()
  const [status, setStatus] = useState<IntakeStatus>(initialStatus)
  const [timestamps, setTimestamps] = useState<Map<string, string>>(new Map())
  const [isConnecting, setIsConnecting] = useState(true)
  const [isDisconnected, setIsDisconnected] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  // Memoize Supabase client to prevent recreation on every render
  const supabase = useMemo(() => createClient(), [])

  // Fetch status history timestamps on mount
  useEffect(() => {
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
  }, [intakeId, supabase])

  // If Realtime never connects (e.g. intakes not in publication), stop showing "Connecting"
  // after 8s and rely on polling fallback
  useEffect(() => {
    if (!isConnecting) return
    const t = setTimeout(() => {
      setIsConnecting(false)
      setIsDisconnected(true)
    }, 8000)
    return () => clearTimeout(t)
  }, [isConnecting])

  // Subscribe to realtime status updates with reconnection logic
  useEffect(() => {
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
  }, [intakeId, onStatusChange, retryCount, supabase])

  // Polling fallback: when Realtime is connecting or disconnected, poll every 30s
  // so status still updates if WebSockets are blocked or Realtime is unavailable
  useEffect(() => {
    if (!isConnecting && !isDisconnected) return

    const poll = async () => {
      const { data } = await supabase
        .from("intakes")
        .select("status")
        .eq("id", intakeId)
        .single()

      if (data?.status) {
        setStatus(prev => {
          if (prev === data.status) return prev
          const newStatus = data.status as IntakeStatus
          setTimestamps(t => {
            const next = new Map(t)
            if (!next.has(newStatus)) next.set(newStatus, new Date().toISOString())
            return next
          })
          onStatusChange?.(newStatus)
          return newStatus
        })
      }
    }

    const interval = setInterval(poll, 30000)
    poll() // initial poll
    return () => clearInterval(interval)
  }, [intakeId, isConnecting, isDisconnected, onStatusChange, supabase])

  const currentIndex = getStatusIndex(status)
  const isSpecialStatus = status in SPECIAL_STATUSES
  const specialStatus = SPECIAL_STATUSES[status]
  const estimatedWait = getEstimatedWaitTime(intakeId)
  const showWaitTime = status === "paid" || status === "in_review"

  // Countdown timer for estimated wait
  const [elapsedMinutes, setElapsedMinutes] = useState(0)
  useEffect(() => {
    if (!showWaitTime) return
    // Calculate elapsed from the first timestamp (paid)
    const paidAt = timestamps.get("paid")
    if (paidAt) {
      const elapsed = Math.floor((Date.now() - new Date(paidAt).getTime()) / 60000)
      setElapsedMinutes(elapsed)
    }
    const interval = setInterval(() => {
      const paidTimestamp = timestamps.get("paid")
      if (paidTimestamp) {
        setElapsedMinutes(Math.floor((Date.now() - new Date(paidTimestamp).getTime()) / 60000))
      }
    }, 60000) // update every minute
    return () => clearInterval(interval)
  }, [showWaitTime, timestamps])

  const remainingMinutes = Math.max(0, estimatedWait - elapsedMinutes)

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
            initial={prefersReducedMotion ? false : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={prefersReducedMotion ? undefined : { opacity: 0, height: 0 }}
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

      {/* Estimated wait time with countdown */}
      {showWaitTime && (
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-5 p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
              <Clock className="h-4 w-4" />
              <span className="text-sm font-medium">
                {remainingMinutes > 0
                  ? `Estimated ~${remainingMinutes} min remaining`
                  : "Should be reviewed any moment now"
                }
              </span>
            </div>
            {/* Mini progress ring */}
            <svg className="h-8 w-8 -rotate-90" viewBox="0 0 32 32">
              <circle
                cx="16" cy="16" r="12"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                className="text-blue-200 dark:text-blue-800"
              />
              <motion.circle
                cx="16" cy="16" r="12"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                className="text-blue-600 dark:text-blue-400"
                strokeDasharray={75.4}
                initial={{ strokeDashoffset: 75.4 }}
                animate={{
                  strokeDashoffset: 75.4 * (1 - Math.min(1, elapsedMinutes / estimatedWait)),
                }}
                transition={{ duration: prefersReducedMotion ? 0 : 1, ease: "easeOut" }}
              />
            </svg>
          </div>
        </motion.div>
      )}

      {/* Progress steps */}
      <div className="relative">
        {/* Background progress line */}
        <div className="absolute left-[15px] top-[24px] bottom-[24px] w-0.5 bg-muted" />
        {/* Animated filled progress line */}
        <motion.div
          className="absolute left-[15px] top-[24px] w-0.5 bg-gradient-to-b from-primary to-primary/70 origin-top"
          initial={prefersReducedMotion ? false : { scaleY: 0 }}
          animate={{
            scaleY: Math.max(0, Math.min(1, currentIndex / (STATUS_STEPS.length - 1))),
            height: "calc(100% - 48px)",
          }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.7, ease: [0.32, 0, 0.24, 1] }}
        />
        {/* Shimmer dot at the end of the progress line */}
        {currentIndex > 0 && currentIndex < STATUS_STEPS.length - 1 && !isSpecialStatus && (
          <motion.div
            className="absolute left-[13px] w-1.5 h-1.5 rounded-full bg-primary z-10"
            initial={false}
            animate={{
              top: `${24 + (currentIndex / (STATUS_STEPS.length - 1)) * (100 - 48)}%`,
              opacity: [1, 0.4, 1],
            }}
            transition={{
              top: { duration: prefersReducedMotion ? 0 : 0.7, ease: [0.32, 0, 0.24, 1] },
              opacity: { duration: 2, repeat: Infinity, ease: "easeInOut" },
            }}
          />
        )}

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
                initial={prefersReducedMotion ? false : { opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: prefersReducedMotion ? 0 : index * 0.1 }}
              >
                {/* Icon */}
                <div
                  className={cn(
                    "relative z-10 h-8 w-8 rounded-full flex items-center justify-center border-2 transition-all duration-300",
                    isComplete && "bg-primary border-primary text-primary-foreground",
                    isActive && "bg-primary/10 border-primary text-primary",
                    isPending && "bg-muted border-muted-foreground/20 text-muted-foreground"
                  )}
                >
                  {/* Shimmer ring for active step */}
                  {isActive && (
                    <motion.span
                      className="absolute inset-[-3px] rounded-full border-2 border-primary/40"
                      animate={{ scale: [1, 1.3, 1], opacity: [0.6, 0, 0.6] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    />
                  )}
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
                      <span className="text-xs text-muted-foreground tabular-nums shrink-0">
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
