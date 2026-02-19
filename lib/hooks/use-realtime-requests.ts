"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import type { IntakeWithPatient } from "@/types/db"
import type { RealtimeChannel } from "@supabase/supabase-js"

interface UseRealtimeRequestsOptions {
  onNewRequest?: (intake: IntakeWithPatient) => void
  onRequestUpdate?: (intake: IntakeWithPatient) => void
}

interface UseRealtimeRequestsReturn {
  newRequestCount: number
  lastNewRequest: IntakeWithPatient | null
  clearNewRequestCount: () => void
  isConnected: boolean
}

/**
 * Hook for real-time intake updates on the doctor dashboard
 * Subscribes to Supabase realtime for intake changes (intakes is single source of truth)
 */
export function useRealtimeRequests(
  initialIntakes: IntakeWithPatient[],
  options: UseRealtimeRequestsOptions = {}
): UseRealtimeRequestsReturn {
  const { onNewRequest, onRequestUpdate } = options
  const [newRequestCount, setNewRequestCount] = useState(0)
  const [lastNewRequest, setLastNewRequest] = useState<IntakeWithPatient | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const channelRef = useRef<RealtimeChannel | null>(null)
  const knownIntakeIds = useRef<Set<string>>(new Set(initialIntakes.map(r => r.id)))

  const clearNewRequestCount = useCallback(() => {
    setNewRequestCount(0)
    setLastNewRequest(null)
  }, [])

  useEffect(() => {
    const supabase = createClient()

    // Subscribe to intakes table changes (intakes is single source of truth)
    const channel = supabase
      .channel("doctor-dashboard-intakes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "intakes",
          filter: "status=eq.paid",
        },
        async (payload) => {
          const newIntake = payload.new as { id: string; patient_id: string }

          // Skip if we already know about this intake
          if (knownIntakeIds.current.has(newIntake.id)) return

          // Fetch full intake with patient data
          const { data: fullIntake } = await supabase
            .from("intakes")
            .select(`
              *,
              patient:profiles!patient_id (
                id, full_name, email, date_of_birth, medicare_number, phone
              )
            `)
            .eq("id", newIntake.id)
            .single()

          if (fullIntake) {
            knownIntakeIds.current.add(fullIntake.id)
            setNewRequestCount((prev) => prev + 1)
            setLastNewRequest(fullIntake as unknown as IntakeWithPatient)
            onNewRequest?.(fullIntake as unknown as IntakeWithPatient)
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "intakes",
        },
        async (payload) => {
          const updatedIntake = payload.new as { id: string }

          // Fetch full intake with patient data
          const { data: fullIntake } = await supabase
            .from("intakes")
            .select(`
              *,
              patient:profiles!patient_id (
                id, full_name, email, date_of_birth, medicare_number, phone
              )
            `)
            .eq("id", updatedIntake.id)
            .single()

          if (fullIntake) {
            onRequestUpdate?.(fullIntake as unknown as IntakeWithPatient)
          }
        }
      )
      .subscribe((status) => {
        setIsConnected(status === "SUBSCRIBED")
      })

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
    }
  }, [onNewRequest, onRequestUpdate])

  return {
    newRequestCount,
    lastNewRequest,
    clearNewRequestCount,
    isConnected,
  }
}
