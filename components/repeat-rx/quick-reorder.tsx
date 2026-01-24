"use client"

/**
 * Quick Reorder Component
 * 
 * Allows returning prescription users to quickly reorder their last medication.
 * Based on PATIENT_JOURNEY_SIMULATION.md findings where regular users want "repeat last order".
 */

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Pill, Clock, ArrowRight, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface LastPrescription {
  id: string
  medicationName: string
  strength: string | null
  form: string | null
  lastOrderedAt: string
  pbsCode: string | null
}

interface QuickReorderProps {
  userId: string
  onReorder: (prescription: LastPrescription) => Promise<void>
  className?: string
}

export function QuickReorder({ userId, onReorder, className }: QuickReorderProps) {
  const [lastPrescription, setLastPrescription] = useState<LastPrescription | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isReordering, setIsReordering] = useState(false)

  useEffect(() => {
    async function fetchLastPrescription() {
      try {
        const response = await fetch(`/api/patient/last-prescription?userId=${userId}`)
        if (response.ok) {
          const data = await response.json()
          if (data.prescription) {
            setLastPrescription(data.prescription)
          }
        }
      } catch {
        // Silently fail - quick reorder is optional
      } finally {
        setIsLoading(false)
      }
    }

    if (userId) {
      fetchLastPrescription()
    } else {
      setIsLoading(false)
    }
  }, [userId])

  const handleReorder = async () => {
    if (!lastPrescription) return

    setIsReordering(true)
    try {
      await onReorder(lastPrescription)
    } catch {
      // Error handling done by parent
    } finally {
      setIsReordering(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return "Today"
    if (diffDays === 1) return "Yesterday"
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
    return date.toLocaleDateString("en-AU", { day: "numeric", month: "short" })
  }

  if (isLoading) {
    return null // Don't show loading state - quick reorder is optional
  }

  if (!lastPrescription) {
    return null // No previous prescription to reorder
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "rounded-xl border border-primary/20 bg-primary/5 p-4",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <Pill className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-sm text-foreground">
            Order same again?
          </h3>
          <p className="text-sm text-muted-foreground mt-0.5 truncate">
            {lastPrescription.medicationName}
            {lastPrescription.strength && ` ${lastPrescription.strength}`}
          </p>
          <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span>Last ordered {formatDate(lastPrescription.lastOrderedAt)}</span>
          </div>
        </div>
        <Button
          size="sm"
          onClick={handleReorder}
          disabled={isReordering}
          className="shrink-0"
        >
          {isReordering ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              Reorder
              <ArrowRight className="w-4 h-4 ml-1" />
            </>
          )}
        </Button>
      </div>
    </motion.div>
  )
}

/**
 * Hook to check if user has a previous prescription to reorder
 */
export function useHasLastPrescription(userId: string | null) {
  const [hasLastPrescription, setHasLastPrescription] = useState(false)

  useEffect(() => {
    async function check() {
      if (!userId) return

      try {
        const response = await fetch(`/api/patient/last-prescription?userId=${userId}`)
        if (response.ok) {
          const data = await response.json()
          setHasLastPrescription(!!data.prescription)
        }
      } catch {
        // Silently fail
      }
    }

    check()
  }, [userId])

  return hasLastPrescription
}
