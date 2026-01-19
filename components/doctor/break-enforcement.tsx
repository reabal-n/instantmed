"use client"

/**
 * Break Enforcement Component
 * 
 * P2 DOCTOR_WORKLOAD_AUDIT: Enhanced break enforcement with:
 * - Mandatory break after 25 cases (not dismissable for 5 minutes)
 * - Warning at 20 cases
 * - Shorter intervals than previous 90-minute threshold
 * - Tracks session metrics for fatigue monitoring
 */

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { 
  Coffee, 
  AlertTriangle, 
  Clock, 
  TrendingUp,
  Heart,
  Brain,
} from "lucide-react"

interface BreakEnforcementProps {
  casesProcessed: number
  sessionStartTime: Date
  onBreakTaken: () => void
  className?: string
}

// Thresholds
const WARNING_THRESHOLD = 20
const MANDATORY_BREAK_THRESHOLD = 25
const MIN_BREAK_DURATION_MS = 5 * 60 * 1000 // 5 minutes

export function BreakEnforcement({
  casesProcessed,
  sessionStartTime,
  onBreakTaken,
  className,
}: BreakEnforcementProps) {
  const [showMandatoryBreak, setShowMandatoryBreak] = useState(false)
  const [breakStartTime, setBreakStartTime] = useState<Date | null>(null)
  const [canDismiss, setCanDismiss] = useState(false)
  const [remainingBreakTime, setRemainingBreakTime] = useState(0)

  // Calculate session duration - use state to avoid impure render
  const [sessionMinutes, setSessionMinutes] = useState(0)
  const [casesPerHour, setCasesPerHour] = useState(0)

  useEffect(() => {
    const updateMetrics = () => {
      const durationMs = Date.now() - sessionStartTime.getTime()
      const minutes = Math.floor(durationMs / 60000)
      setSessionMinutes(minutes)
      setCasesPerHour(minutes > 0 ? Math.round((casesProcessed / minutes) * 60) : 0)
    }
    updateMetrics()
    const interval = setInterval(updateMetrics, 60000) // Update every minute
    return () => clearInterval(interval)
  }, [sessionStartTime, casesProcessed])

  // Check if mandatory break is needed - derive from props
  const needsMandatoryBreak = casesProcessed >= MANDATORY_BREAK_THRESHOLD

  // Open break dialog when threshold reached (controlled by parent or derived)
  if (needsMandatoryBreak && !showMandatoryBreak && !breakStartTime) {
    // Use a timeout to avoid setState during render
    setTimeout(() => {
      setShowMandatoryBreak(true)
      setBreakStartTime(new Date())
      setCanDismiss(false)
    }, 0)
  }

  // Countdown timer for mandatory break
  useEffect(() => {
    if (!breakStartTime || canDismiss) return

    const interval = setInterval(() => {
      const elapsed = Date.now() - breakStartTime.getTime()
      const remaining = Math.max(0, MIN_BREAK_DURATION_MS - elapsed)
      setRemainingBreakTime(remaining)

      if (remaining === 0) {
        setCanDismiss(true)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [breakStartTime, canDismiss])

  const handleBreakComplete = useCallback(() => {
    setShowMandatoryBreak(false)
    setBreakStartTime(null)
    setCanDismiss(false)
    onBreakTaken()
  }, [onBreakTaken])

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    return `${minutes}:${seconds.toString().padStart(2, "0")}`
  }

  // Warning badge (shown in parent component)
  const isWarning = casesProcessed >= WARNING_THRESHOLD && casesProcessed < MANDATORY_BREAK_THRESHOLD
  const progress = (casesProcessed / MANDATORY_BREAK_THRESHOLD) * 100

  return (
    <>
      {/* Session Stats Card */}
      <Card className={className}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Brain className="h-4 w-4" />
            Session Health
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Cases until break */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted-foreground">Cases until break</span>
              <span className="font-medium">
                {Math.max(0, MANDATORY_BREAK_THRESHOLD - casesProcessed)} remaining
              </span>
            </div>
            <Progress 
              value={progress} 
              className={isWarning ? "bg-amber-100" : ""}
            />
          </div>

          {/* Session stats */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">Session:</span>
              <span className="font-medium">{sessionMinutes}m</span>
            </div>
            <div className="flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">Rate:</span>
              <span className="font-medium">{casesPerHour}/hr</span>
            </div>
          </div>

          {/* Warning badge */}
          {isWarning && (
            <div className="flex items-center gap-2 p-2 bg-amber-50 rounded-lg border border-amber-200">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <span className="text-xs text-amber-800">
                Break recommended soon ({MANDATORY_BREAK_THRESHOLD - casesProcessed} cases left)
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Mandatory Break Dialog */}
      <AlertDialog open={showMandatoryBreak}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Coffee className="h-5 w-5 text-primary" />
              Time for a Break
            </AlertDialogTitle>
            <AlertDialogDescription>
              <div className="space-y-4 text-sm text-muted-foreground">
                <p>
                  You&apos;ve processed {casesProcessed} cases this session. Taking regular breaks 
                  helps maintain decision quality and reduces fatigue-related errors.
                </p>

                <div className="bg-primary/5 rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Heart className="h-4 w-4 text-primary" />
                    During your break:
                  </div>
                  <ul className="text-sm space-y-1 text-muted-foreground ml-6">
                    <li>• Step away from the screen</li>
                    <li>• Stretch and move around</li>
                    <li>• Rest your eyes</li>
                    <li>• Hydrate</li>
                  </ul>
                </div>

                {!canDismiss && (
                  <div className="text-center">
                    <Badge variant="secondary" className="text-lg px-4 py-2">
                      {formatTime(remainingBreakTime)}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-2">
                      Minimum break time remaining
                    </p>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="mt-4">
            <Button 
              onClick={handleBreakComplete} 
              disabled={!canDismiss}
              className="w-full"
            >
              {canDismiss ? "Resume Work" : "Please wait..."}
            </Button>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

/**
 * Hook to track session metrics for break enforcement
 */
export function useSessionTracking() {
  const [casesProcessed, setCasesProcessed] = useState(0)
  const [sessionStartTime] = useState(() => new Date())
  const [breaksTaken, setBreaksTaken] = useState(0)

  const incrementCases = useCallback(() => {
    setCasesProcessed(prev => prev + 1)
  }, [])

  const recordBreak = useCallback(() => {
    setBreaksTaken(prev => prev + 1)
    setCasesProcessed(0) // Reset counter after break
  }, [])

  return {
    casesProcessed,
    sessionStartTime,
    breaksTaken,
    incrementCases,
    recordBreak,
  }
}
