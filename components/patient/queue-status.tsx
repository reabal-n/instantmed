"use client"

import { useState, useEffect, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Clock, Users, CheckCircle2, Bell } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface QueueStatusProps {
  requestId: string
  status: string
  createdAt: string
  isPriority?: boolean
  className?: string
}

interface QueueData {
  position: number
  totalInQueue: number
  estimatedMinutes: number
  doctorsOnline: number
}

/**
 * Real-time queue position and ETA display
 * Best practice from Instant Scripts / Doctors on Demand
 * Note: Priority feature has been disabled - isPriority prop is ignored
 */
export function QueueStatus({
  requestId,
  status,
  createdAt,
  isPriority: _isPriority = false, // Disabled - always treat as non-priority
  className,
}: QueueStatusProps) {
  // Use stable seed based on createdAt to avoid impure render
  const [randomSeed] = useState(() => {
    const requestAge = Date.now() - new Date(createdAt).getTime()
    const ageMinutes = Math.floor(requestAge / 60000)
    return {
      ageMinutes,
      queueOffset: Math.floor(Math.random() * 3),
      minuteOffset: Math.floor(Math.random() * 8),
      doctorOffset: Math.floor(Math.random() * 2),
    }
  })

  const initialQueue = useMemo<QueueData | null>(() => {
    if (status !== "pending") return null

    const basePosition = Math.max(1, 5 - Math.floor(randomSeed.ageMinutes / 10))
    // Priority feature disabled - no longer affects queue position
    const position = basePosition

    return {
      position,
      totalInQueue: position + randomSeed.queueOffset,
      estimatedMinutes: position * 12 + randomSeed.minuteOffset,
      doctorsOnline: 2 + randomSeed.doctorOffset,
    }
  }, [status, randomSeed])

  const [queueData, setQueueData] = useState<QueueData | null>(initialQueue)
  const [notifyEnabled, setNotifyEnabled] = useState(false)

  // Simulate queue position (in production, fetch from API)
  useEffect(() => {
    if (status !== "pending") return

    // Update every 30 seconds
    const interval = setInterval(() => {
      setQueueData((prev) => {
        if (!prev || prev.position <= 1) return prev
        return {
          ...prev,
          position: Math.max(1, prev.position - (Math.random() > 0.7 ? 1 : 0)),
          estimatedMinutes: Math.max(5, prev.estimatedMinutes - Math.floor(Math.random() * 5)),
        }
      })
    }, 30000)

    return () => clearInterval(interval)
  }, [requestId, status, createdAt])

  const requestBrowserNotification = async () => {
    if ("Notification" in window) {
      const permission = await Notification.requestPermission()
      if (permission === "granted") {
        setNotifyEnabled(true)
      }
    }
  }

  // Don't show for non-pending requests
  if (status !== "pending" || !queueData) return null

  const getEtaText = () => {
    if (queueData.estimatedMinutes < 15) return "Very soon"
    if (queueData.estimatedMinutes < 30) return "Within 30 min"
    if (queueData.estimatedMinutes <= 15) return "~15 minutes"
    if (queueData.estimatedMinutes < 30) return "~30 minutes"
    return `~${queueData.estimatedMinutes} mins`
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "rounded-2xl border p-4 sm:p-5",
        "bg-linear-to-br from-blue-50 to-cyan-50 border-primary dark:from-blue-950/30 dark:to-cyan-950/30 dark:border-primary",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full flex items-center justify-center bg-primary">
            <Clock className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="font-semibold text-sm">In Queue</p>
            <p className="text-xs text-muted-foreground">
              {queueData.doctorsOnline} doctor{queueData.doctorsOnline > 1 ? "s" : ""} online
            </p>
          </div>
        </div>

        {/* Notify me button */}
        {!notifyEnabled && "Notification" in window && (
          <Button
            variant="outline"
            size="sm"
            onClick={requestBrowserNotification}
            className="text-xs h-8"
          >
            <Bell className="h-3 w-3 mr-1" />
            Notify me
          </Button>
        )}
        {notifyEnabled && (
          <div className="flex items-center gap-1 text-xs text-green-600">
            <CheckCircle2 className="h-3 w-3" />
            Notifications on
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3">
        {/* Position */}
        <div className="text-center p-3 rounded-xl bg-white/60 dark:bg-slate-900/40">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Users className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <AnimatePresence mode="wait">
            <motion.p
              key={queueData.position}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="text-2xl font-bold"
            >
              #{queueData.position}
            </motion.p>
          </AnimatePresence>
          <p className="text-xs text-muted-foreground">Position</p>
        </div>

        {/* ETA */}
        <div className="text-center p-3 rounded-xl bg-white/60 dark:bg-slate-900/40">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <p className="text-lg font-bold text-green-600">{getEtaText()}</p>
          <p className="text-xs text-muted-foreground">Est. wait</p>
        </div>

        {/* Total in queue */}
        <div className="text-center p-3 rounded-xl bg-white/60 dark:bg-slate-900/40">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Users className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <p className="text-2xl font-bold">{queueData.totalInQueue}</p>
          <p className="text-xs text-muted-foreground">In queue</p>
        </div>
      </div>

      {/* Progress indicator */}
      <div className="mt-4">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
          <span>Submitted</span>
          <span>Review</span>
          <span>Complete</span>
        </div>
        <div className="h-2 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-linear-to-r from-blue-500 to-cyan-500"
            initial={{ width: "10%" }}
            animate={{
              width: `${Math.min(90, 30 + (5 - queueData.position) * 15)}%`,
            }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>

      {/* Reassurance text */}
      <p className="text-xs text-muted-foreground mt-3 text-center">
        💡 You&apos;ll receive an email when a doctor starts reviewing your request
      </p>
    </motion.div>
  )
}
