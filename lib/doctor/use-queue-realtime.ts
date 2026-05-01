"use client"

import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"

import { isHydratedQueueRealtimeInsert } from "@/lib/doctor/queue-utils"
import { createClient } from "@/lib/supabase/client"
import type { IntakeWithPatient } from "@/types/db"

interface UseQueueRealtimeOptions {
  onInsert: (intake: IntakeWithPatient) => void
  onUpdate: (intake: Partial<IntakeWithPatient> & { id: string }) => void
  onDelete: (id: string) => void
  playNotificationSound: () => void
}

interface UseQueueRealtimeResult {
  isStale: boolean
  isReconnecting: boolean
}

const MAX_BACKOFF_MS = 30_000
const STALE_THRESHOLD_MS = 90_000
const STALE_CHECK_MS = 30_000

export function useQueueRealtime({
  onInsert,
  onUpdate,
  onDelete,
  playNotificationSound,
}: UseQueueRealtimeOptions): UseQueueRealtimeResult {
  const router = useRouter()
  const [isStale, setIsStale] = useState(false)
  const [isReconnecting, setIsReconnecting] = useState(false)
  const lastSyncTimeRef = useRef<Date>(new Date())
  const backoffRef = useRef(1000) // Start at 1s

  // Stable refs so the subscribe closure doesn't capture stale callbacks
  const onInsertRef = useRef(onInsert)
  const onUpdateRef = useRef(onUpdate)
  const onDeleteRef = useRef(onDelete)
  const playNotificationSoundRef = useRef(playNotificationSound)
  useEffect(() => { onInsertRef.current = onInsert }, [onInsert])
  useEffect(() => { onUpdateRef.current = onUpdate }, [onUpdate])
  useEffect(() => { onDeleteRef.current = onDelete }, [onDelete])
  useEffect(() => { playNotificationSoundRef.current = playNotificationSound }, [playNotificationSound])

  useEffect(() => {
    const supabase = createClient()
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null
    let active = true

    const staleCheckInterval = setInterval(() => {
      const timeSinceSync = Date.now() - lastSyncTimeRef.current.getTime()
      if (timeSinceSync > STALE_THRESHOLD_MS) {
        setIsStale(true)
      }
    }, STALE_CHECK_MS)

    function subscribe() {
      if (!active) return

      const channel = supabase
        .channel("queue-updates")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "intakes",
            filter: "status=in.(paid,in_review,pending_info,awaiting_script)",
          },
          (payload) => {
            lastSyncTimeRef.current = new Date()
            setIsStale(false)

            if (payload.eventType === "INSERT") {
              const newRow = payload.new as Partial<IntakeWithPatient> & { id: string }
              // Sound only — toast is handled by IntakeNotificationListener
              // to avoid duplicate notifications.
              playNotificationSoundRef.current()
              if (isHydratedQueueRealtimeInsert(newRow)) {
                onInsertRef.current(newRow as IntakeWithPatient)
              } else {
                router.refresh()
              }
            } else if (payload.eventType === "UPDATE") {
              onUpdateRef.current(payload.new as Partial<IntakeWithPatient> & { id: string })
            } else if (payload.eventType === "DELETE") {
              onDeleteRef.current(payload.old.id as string)
            }
          },
        )
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            lastSyncTimeRef.current = new Date()
            setIsStale(false)
            setIsReconnecting(false)
            backoffRef.current = 1000 // Reset on success
          } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            setIsStale(true)
            setIsReconnecting(true)

            // Exponential backoff reconnect (1s → 2s → 4s → 8s → 16s → max 30s)
            const delay = Math.min(backoffRef.current, MAX_BACKOFF_MS)
            backoffRef.current = Math.min(delay * 2, MAX_BACKOFF_MS)
            supabase.removeChannel(channel)
            reconnectTimer = setTimeout(subscribe, delay)
          }
        })

      return channel
    }

    const channel = subscribe()

    return () => {
      active = false
      if (channel) supabase.removeChannel(channel)
      clearInterval(staleCheckInterval)
      if (reconnectTimer) clearTimeout(reconnectTimer)
    }
  }, [router])

  return { isStale, isReconnecting }
}
