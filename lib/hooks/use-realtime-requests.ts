"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import type { RequestWithPatient } from "@/types/db"
import type { RealtimeChannel } from "@supabase/supabase-js"

interface UseRealtimeRequestsOptions {
  onNewRequest?: (request: RequestWithPatient) => void
  onRequestUpdate?: (request: RequestWithPatient) => void
  enableSound?: boolean
}

interface UseRealtimeRequestsReturn {
  newRequestCount: number
  lastNewRequest: RequestWithPatient | null
  clearNewRequestCount: () => void
  isConnected: boolean
}

// Notification sound (base64 encoded short beep)
const NOTIFICATION_SOUND = "data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU" +
  "tvT19" + "A".repeat(100)

/**
 * Hook for real-time request updates on the doctor dashboard
 * Subscribes to Supabase realtime for request changes
 */
export function useRealtimeRequests(
  initialRequests: RequestWithPatient[],
  options: UseRealtimeRequestsOptions = {}
): UseRealtimeRequestsReturn {
  const { onNewRequest, onRequestUpdate, enableSound = true } = options
  const [newRequestCount, setNewRequestCount] = useState(0)
  const [lastNewRequest, setLastNewRequest] = useState<RequestWithPatient | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const channelRef = useRef<RealtimeChannel | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const knownRequestIds = useRef<Set<string>>(new Set(initialRequests.map(r => r.id)))

  // Initialize audio element
  useEffect(() => {
    if (typeof window !== "undefined" && enableSound) {
      audioRef.current = new Audio(NOTIFICATION_SOUND)
      audioRef.current.volume = 0.5
    }
  }, [enableSound])

  const playNotificationSound = useCallback(() => {
    if (audioRef.current && enableSound) {
      audioRef.current.play().catch(() => {
        // Ignore autoplay errors - user hasn't interacted yet
      })
    }
  }, [enableSound])

  const clearNewRequestCount = useCallback(() => {
    setNewRequestCount(0)
    setLastNewRequest(null)
  }, [])

  useEffect(() => {
    const supabase = createClient()

    // Subscribe to requests table changes
    const channel = supabase
      .channel("doctor-dashboard-requests")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "requests",
          filter: "status=eq.pending",
        },
        async (payload) => {
          const newRequest = payload.new as { id: string; patient_id: string }
          
          // Skip if we already know about this request
          if (knownRequestIds.current.has(newRequest.id)) return

          // Fetch full request with patient data
          const { data: fullRequest } = await supabase
            .from("requests")
            .select(`
              *,
              patient:profiles!requests_patient_id_fkey (
                id, full_name, email, date_of_birth, medicare_number, phone
              )
            `)
            .eq("id", newRequest.id)
            .single()

          if (fullRequest) {
            knownRequestIds.current.add(fullRequest.id)
            setNewRequestCount((prev) => prev + 1)
            setLastNewRequest(fullRequest as RequestWithPatient)
            playNotificationSound()
            onNewRequest?.(fullRequest as RequestWithPatient)
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "requests",
        },
        async (payload) => {
          const updatedRequest = payload.new as { id: string }

          // Fetch full request with patient data
          const { data: fullRequest } = await supabase
            .from("requests")
            .select(`
              *,
              patient:profiles!requests_patient_id_fkey (
                id, full_name, email, date_of_birth, medicare_number, phone
              )
            `)
            .eq("id", updatedRequest.id)
            .single()

          if (fullRequest) {
            onRequestUpdate?.(fullRequest as RequestWithPatient)
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
  }, [onNewRequest, onRequestUpdate, playNotificationSound])

  return {
    newRequestCount,
    lastNewRequest,
    clearNewRequestCount,
    isConnected,
  }
}
