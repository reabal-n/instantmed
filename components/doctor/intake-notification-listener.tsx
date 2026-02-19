"use client"

import { useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface IntakeNotificationListenerProps {
  doctorId: string
}

export function IntakeNotificationListener({
  doctorId,
}: IntakeNotificationListenerProps) {
  const router = useRouter()
  // Track notified intake IDs to prevent duplicates across all handlers
  const notifiedIdsRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel("doctor-intake-notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "intakes",
        },
        (payload) => {
          const intake = payload.new

          // Only notify for paid intakes (ready for doctor review)
          if (intake.status === "paid") {
            // Prevent duplicate notifications across all handlers
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
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "intakes",
        },
        (payload) => {
          const intake = payload.new
          const oldIntake = payload.old

          // Notify when patient responds to info request (pending_info → paid)
          if (oldIntake.status === "pending_info" && intake.status === "paid") {
            if (notifiedIdsRef.current.has(`info-${intake.id}`)) return
            notifiedIdsRef.current.add(`info-${intake.id}`)

            toast.info("Patient responded", {
              description: "Patient has provided additional information",
              action: {
                label: "Review",
                onClick: () => router.push(`/doctor/intakes/${intake.id}`),
              },
              duration: 10000,
            })

            router.refresh()
            return
          }

          // Notify when intake becomes paid (payment completed after creation)
          // Skip if we already notified for this intake via INSERT
          if (oldIntake.status !== "paid" && intake.status === "paid") {
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
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [doctorId, router])

  return null
}
