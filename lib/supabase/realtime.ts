"use client"

import { useEffect, useRef } from "react"
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

interface RealtimePayload {
  new: Record<string, unknown>
  old: Record<string, unknown>
  eventType: string
}

interface UseRealtimeOptions {
  table: string
  event?: "INSERT" | "UPDATE" | "DELETE" | "*"
  filter?: string
  onPayload: (payload: RealtimePayload) => void
  enabled?: boolean
}

export function useSupabaseRealtime({ table, event = "*", filter, onPayload, enabled = true }: UseRealtimeOptions) {
  const channelRef = useRef<RealtimeChannel | null>(null)
  const onPayloadRef = useRef(onPayload)
  onPayloadRef.current = onPayload

  useEffect(() => {
    if (!enabled) return

    const client = getRealtimeClient()
    const channelName = `realtime:${table}:${filter || "all"}`

    const channel = client.channel(channelName).on(
      // @ts-expect-error -- supabase-js types don't expose postgres_changes as a literal
      "postgres_changes",
      {
        event,
        schema: "public",
        table,
        ...(filter ? { filter } : {}),
      },
      (payload: Record<string, unknown>) => {
        onPayloadRef.current({
          new: (payload.new as Record<string, unknown>) || {},
          old: (payload.old as Record<string, unknown>) || {},
          eventType: (payload.eventType as string) || event,
        })
      }
    ).subscribe()

    channelRef.current = channel

    return () => {
      channel.unsubscribe()
      channelRef.current = null
    }
  }, [table, event, filter, enabled])
}
