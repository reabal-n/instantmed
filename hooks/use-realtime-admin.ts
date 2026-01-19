"use client"

/**
 * Real-time Admin Hooks
 * Provides Supabase realtime subscriptions for admin dashboards
 */

import { useEffect, useState, useCallback, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import type { RealtimeChannel, RealtimePostgresChangesPayload } from "@supabase/supabase-js"

// ============================================================================
// TYPES
// ============================================================================

interface RealtimeOptions {
  enabled?: boolean
  onInsert?: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void
  onUpdate?: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void
  onDelete?: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void
}

interface UseRealtimeTableResult {
  isConnected: boolean
  lastEvent: RealtimePostgresChangesPayload<Record<string, unknown>> | null
  error: string | null
}

// ============================================================================
// GENERIC TABLE SUBSCRIPTION HOOK
// ============================================================================

/**
 * Subscribe to real-time changes on a Supabase table
 */
export function useRealtimeTable(
  tableName: string,
  options: RealtimeOptions = {}
): UseRealtimeTableResult {
  const { enabled = true, onInsert, onUpdate, onDelete } = options
  const [isConnected, setIsConnected] = useState(false)
  const [lastEvent, setLastEvent] = useState<RealtimePostgresChangesPayload<Record<string, unknown>> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const channelRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    if (!enabled) return

    const supabase = createClient()
    const channelName = `admin-${tableName}-${Date.now()}`

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: tableName },
        (payload) => {
          setLastEvent(payload)

          if (payload.eventType === "INSERT" && onInsert) {
            onInsert(payload)
          } else if (payload.eventType === "UPDATE" && onUpdate) {
            onUpdate(payload)
          } else if (payload.eventType === "DELETE" && onDelete) {
            onDelete(payload)
          }
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setIsConnected(true)
          setError(null)
        } else if (status === "CHANNEL_ERROR") {
          setIsConnected(false)
          setError("Failed to connect to realtime channel")
        } else if (status === "TIMED_OUT") {
          setIsConnected(false)
          setError("Connection timed out")
        }
      })

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [tableName, enabled, onInsert, onUpdate, onDelete])

  return { isConnected, lastEvent, error }
}

// ============================================================================
// SPECIALIZED ADMIN HOOKS
// ============================================================================

/**
 * Subscribe to intake changes (for admin queue)
 */
export function useRealtimeIntakes(
  onUpdate?: (intake: Record<string, unknown>) => void
) {
  const [newIntakeCount, setNewIntakeCount] = useState(0)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  const handleInsert = useCallback((_payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
    setNewIntakeCount((prev) => prev + 1)
    setLastUpdate(new Date())
  }, [])

  const handleUpdate = useCallback((payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
    setLastUpdate(new Date())
    if (onUpdate && payload.new) {
      onUpdate(payload.new)
    }
  }, [onUpdate])

  const { isConnected, error } = useRealtimeTable("intakes", {
    onInsert: handleInsert,
    onUpdate: handleUpdate,
  })

  const clearNewCount = useCallback(() => {
    setNewIntakeCount(0)
  }, [])

  return {
    isConnected,
    error,
    newIntakeCount,
    lastUpdate,
    clearNewCount,
  }
}

/**
 * Subscribe to audit log changes (for compliance dashboard)
 */
export function useRealtimeAuditLog(
  onNewEvent?: (event: Record<string, unknown>) => void
) {
  const [eventCount, setEventCount] = useState(0)

  const handleInsert = useCallback((payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
    setEventCount((prev) => prev + 1)
    if (onNewEvent && payload.new) {
      onNewEvent(payload.new)
    }
  }, [onNewEvent])

  const { isConnected, error } = useRealtimeTable("audit_log", {
    onInsert: handleInsert,
  })

  return {
    isConnected,
    error,
    eventCount,
  }
}

/**
 * Subscribe to payment/refund changes
 */
export function useRealtimePayments(
  onRefund?: (payment: Record<string, unknown>) => void
) {
  const [refundCount, setRefundCount] = useState(0)

  const handleUpdate = useCallback((payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
    const newData = payload.new as Record<string, unknown> | undefined
    if (newData?.refund_status === "refunded" || newData?.refund_status === "processing") {
      setRefundCount((prev) => prev + 1)
      if (onRefund) {
        onRefund(newData)
      }
    }
  }, [onRefund])

  const { isConnected, error } = useRealtimeTable("payments", {
    onUpdate: handleUpdate,
  })

  return {
    isConnected,
    error,
    refundCount,
  }
}

/**
 * Subscribe to webhook DLQ changes
 */
export function useRealtimeDLQ(
  onNewEntry?: (entry: Record<string, unknown>) => void
) {
  const [dlqCount, setDlqCount] = useState(0)

  const handleInsert = useCallback((payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
    setDlqCount((prev) => prev + 1)
    if (onNewEntry && payload.new) {
      onNewEntry(payload.new)
    }
  }, [onNewEntry])

  const { isConnected, error } = useRealtimeTable("stripe_webhook_dead_letter", {
    onInsert: handleInsert,
  })

  return {
    isConnected,
    error,
    dlqCount,
  }
}

// ============================================================================
// CONNECTION STATUS COMPONENT HELPER
// ============================================================================

/**
 * Combined realtime status for admin dashboard
 */
export function useAdminRealtimeStatus() {
  const intakes = useRealtimeIntakes()
  const auditLog = useRealtimeAuditLog()
  const payments = useRealtimePayments()
  const dlq = useRealtimeDLQ()

  const allConnected = intakes.isConnected && auditLog.isConnected && payments.isConnected && dlq.isConnected
  const hasErrors = !!(intakes.error || auditLog.error || payments.error || dlq.error)

  return {
    allConnected,
    hasErrors,
    intakes,
    auditLog,
    payments,
    dlq,
  }
}
