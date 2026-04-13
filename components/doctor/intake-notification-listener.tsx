"use client"

import { useRouter } from "next/navigation"
import { useEffect, useRef } from "react"
import { toast } from "sonner"

import { createClient } from "@/lib/supabase/client"

export function IntakeNotificationListener() {
  const router = useRouter()
  // Track notified intake IDs to prevent duplicates across all handlers
  const notifiedIdsRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    const supabase = createClient()

    // Subscribe ONLY to INSERT events.
    // Supabase Realtime with default replica identity sends only the PK in
    // payload.old for UPDATE events, so oldIntake.status is always undefined,
    // causing `undefined !== "paid"` → true → spurious toasts on every update
    // (lock extensions, claim changes, note saves, etc.).
    //
    // New intakes are always created with status="draft" and later updated to
    // "paid" by the Stripe webhook. By the time the webhook fires, the intake
    // row already exists, so an INSERT filter alone would miss payment events.
    // Instead we filter UPDATEs to only the status column change to "paid".
    const channel = supabase
      .channel("doctor-intake-notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "intakes",
          filter: "status=eq.paid",
        },
        (payload) => {
          const intake = payload.new

          if (notifiedIdsRef.current.has(intake.id)) return
          notifiedIdsRef.current.add(intake.id)

          toast.info("New request received", {
            description: `${intake.category || "Medical"} request is ready for review`,
            action: {
              label: "View",
              onClick: () => router.push(`/doctor/intakes/${intake.id}`),
            },
            duration: 10000,
          })

          router.refresh()
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "intakes",
          filter: "status=eq.paid",
        },
        (payload) => {
          const intake = payload.new

          // Only notify if this is a genuine new-to-paid transition.
          // Since Supabase default replica identity doesn't give us the old status,
          // we rely on the dedup set: if we already notified for this intake, skip.
          if (notifiedIdsRef.current.has(intake.id)) return
          notifiedIdsRef.current.add(intake.id)

          toast.info("New request ready", {
            description: `${intake.category || "Medical"} request payment completed`,
            action: {
              label: "View",
              onClick: () => router.push(`/doctor/intakes/${intake.id}`),
            },
            duration: 10000,
          })

          router.refresh()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [router])

  return null
}
