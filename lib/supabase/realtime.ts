"use client"

import { useEffect, useRef, useCallback } from "react"
import { createClient } from "@supabase/supabase-js"
import type { RealtimeChannel } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

let realtimeClient: ReturnType<typeof createClient> | null = null

function getRealtimeClient() {
  if (!realtimeClient) {
    realtimeClient = createClient(supabaseUrl, supabaseAnonKey, {
      realtime: { params: { eventsPerSecond: 10 } },
    })
  }
  return realtimeClient
}

interface UseRealtimeOptions {
  table: string
  event?: "INSERT" | "UPDATE" | "DELETE" | "*"
  filter?: string
  onPayload: (payload: { new: Record<string, unknown>; old: Record<string, unknown>; eventType: string }) => void
  enabled?: boolean
}

export function useSupabaseRealtime({ table, event = "*", filter, onPayload, enabled = true }: UseRealtimeOptions) {
  const channelRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    if (!enabled) return

    const client = getRealtimeClient()
    const channelName = `realtime:${table}:${filter || "all"}`

    const channel = client.channel(channelName).on(
      "postgres_changes" as any,
      {
        event,
        schema: "public",
        table,
        ...(filter ? { filter } : {}),
      },
      (payload: any) => {
        onPayload({
          new: payload.new || {},
          old: payload.old || {},
          eventType: payload.eventType || event,
        })
      }
    ).subscribe()

    channelRef.current = channel

    return () => {
      channel.unsubscribe()
      channelRef.current = null
    }
  }, [table, event, filter, enabled]) // Intentionally exclude onPayload to avoid re-subscriptions
}
