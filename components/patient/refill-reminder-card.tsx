"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { Pill, Clock, ArrowRight, AlertTriangle, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface RefillItem {
  medication: string
  daysRemaining: number
  refillUrl: string
}

interface RefillReminderCardProps {
  patientId: string
  className?: string
}

/**
 * Displays upcoming prescription refills for the patient dashboard
 * Best practice from Instant Scripts - proactive refill management
 */
export function RefillReminderCard({ patientId, className }: RefillReminderCardProps) {
  const [refills, setRefills] = useState<RefillItem[]>([])
  const [dismissed, setDismissed] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchRefills() {
      try {
        const res = await fetch(`/api/patient/upcoming-refills?patientId=${patientId}`)
        if (res.ok) {
          const data = await res.json()
          setRefills(data.refills || [])
        }
      } catch {
        // Silently fail - non-critical feature
      } finally {
        setLoading(false)
      }
    }

    // Load dismissed from localStorage
    const stored = localStorage.getItem("dismissed_refills")
    if (stored) {
      setDismissed(JSON.parse(stored))
    }

    fetchRefills()
  }, [patientId])

  const dismissRefill = (medication: string) => {
    const newDismissed = [...dismissed, medication]
    setDismissed(newDismissed)
    localStorage.setItem("dismissed_refills", JSON.stringify(newDismissed))
  }

  const visibleRefills = refills.filter((r) => !dismissed.includes(r.medication))

  if (loading || visibleRefills.length === 0) return null

  const getUrgencyColor = (days: number) => {
    if (days <= 3) return "text-red-600 bg-red-50 border-red-200"
    if (days <= 7) return "text-amber-600 bg-amber-50 border-amber-200"
    return "text-primary bg-blue-50 border-primary"
  }

  const getUrgencyIcon = (days: number) => {
    if (days <= 3) return <AlertTriangle className="h-4 w-4" />
    if (days <= 7) return <Clock className="h-4 w-4" />
    return <Pill className="h-4 w-4" />
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("rounded-2xl border bg-white dark:bg-gray-900 overflow-hidden", className)}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b bg-linear-to-r from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-purple-500 flex items-center justify-center">
            <Pill className="h-4 w-4 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">Prescription Refills</h3>
            <p className="text-xs text-muted-foreground">
              {visibleRefills.length} medication{visibleRefills.length > 1 ? "s" : ""} running low
            </p>
          </div>
        </div>
      </div>

      {/* Refill Items */}
      <div className="divide-y">
        <AnimatePresence>
          {visibleRefills.slice(0, 3).map((refill) => (
            <motion.div
              key={refill.medication}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1">
                  <div
                    className={cn(
                      "h-10 w-10 rounded-xl flex items-center justify-center border",
                      getUrgencyColor(refill.daysRemaining)
                    )}
                  >
                    {getUrgencyIcon(refill.daysRemaining)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{refill.medication}</p>
                    <p
                      className={cn(
                        "text-xs font-medium",
                        refill.daysRemaining <= 3
                          ? "text-red-600"
                          : refill.daysRemaining <= 7
                            ? "text-amber-600"
                            : "text-muted-foreground"
                      )}
                    >
                      {refill.daysRemaining <= 0
                        ? "May have run out"
                        : refill.daysRemaining === 1
                          ? "Runs out tomorrow"
                          : `${refill.daysRemaining} days remaining`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                    onClick={() => dismissRefill(refill.medication)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    className={cn(
                      "h-8 text-xs",
                      refill.daysRemaining <= 3
                        ? "bg-red-600 hover:bg-red-700"
                        : refill.daysRemaining <= 7
                          ? "bg-amber-600 hover:bg-amber-700"
                          : ""
                    )}
                    asChild
                  >
                    <Link href={refill.refillUrl}>
                      Refill
                      <ArrowRight className="h-3 w-3 ml-1" />
                    </Link>
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Show more link if there are more than 3 */}
      {visibleRefills.length > 3 && (
        <div className="px-4 py-2 border-t bg-gray-50 dark:bg-gray-800/50">
          <Link
            href="/patient/prescriptions"
            className="text-xs text-primary hover:underline flex items-center gap-1"
          >
            View all {visibleRefills.length} medications
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      )}
    </motion.div>
  )
}

/**
 * Compact inline refill reminder for use in headers/banners
 */
export function RefillBanner({ refill }: { refill: RefillItem }) {
  if (refill.daysRemaining > 7) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex items-center justify-between gap-3 px-4 py-2 text-sm",
        refill.daysRemaining <= 3
          ? "bg-red-50 text-red-800 dark:bg-red-950/50 dark:text-red-200"
          : "bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-200"
      )}
    >
      <div className="flex items-center gap-2">
        {refill.daysRemaining <= 3 ? (
          <AlertTriangle className="h-4 w-4" />
        ) : (
          <Clock className="h-4 w-4" />
        )}
        <span>
          <strong>{refill.medication}</strong> runs out in {refill.daysRemaining} day
          {refill.daysRemaining > 1 ? "s" : ""}
        </span>
      </div>
      <Button
        size="sm"
        variant={refill.daysRemaining <= 3 ? "destructive" : "default"}
        className="h-7 text-xs"
        asChild
      >
        <Link href={refill.refillUrl}>Refill now</Link>
      </Button>
    </motion.div>
  )
}
