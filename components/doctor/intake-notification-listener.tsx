"use client"

import { useEffect, useRef, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface IntakeNotificationListenerProps {
  doctorId: string
  enableSound?: boolean
}

const NOTIFICATION_SOUND_URL = "/sounds/notification.mp3"

export function IntakeNotificationListener({ 
  doctorId, 
  enableSound = true 
}: IntakeNotificationListenerProps) {
  const router = useRouter()
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const lastNotificationRef = useRef<string | null>(null)

  const playNotificationSound = useCallback(() => {
    if (!enableSound) return
    
    try {
      if (!audioRef.current) {
        audioRef.current = new Audio(NOTIFICATION_SOUND_URL)
        audioRef.current.volume = 0.5
      }
      audioRef.current.currentTime = 0
      audioRef.current.play().catch(() => {
        // Audio play failed - user hasn't interacted with page yet
      })
    } catch {
      // Audio not supported
    }
  }, [enableSound])

  useEffect(() => {
    const supabase = createClient()

    // Listen for new intakes (status = 'paid' means ready for review)
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
            // Prevent duplicate notifications
            if (lastNotificationRef.current === intake.id) return
            lastNotificationRef.current = intake.id

            playNotificationSound()
            
            toast.info("New request received", {
              description: `${intake.category || "Medical"} request is ready for review`,
              action: {
                label: "View",
                onClick: () => router.push(`/doctor/intakes/${intake.id}`),
              },
              duration: 10000,
            })

            // Refresh to update queue
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
          
          // Notify when intake becomes paid (payment completed)
          if (oldIntake.status !== "paid" && intake.status === "paid") {
            if (lastNotificationRef.current === intake.id) return
            lastNotificationRef.current = intake.id

            playNotificationSound()
            
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

          // Notify when patient responds to info request
          if (oldIntake.status === "pending_info" && intake.status === "paid") {
            if (lastNotificationRef.current === `info-${intake.id}`) return
            lastNotificationRef.current = `info-${intake.id}`

            playNotificationSound()
            
            toast.info("Patient responded", {
              description: "Patient has provided additional information",
              action: {
                label: "Review",
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
  }, [doctorId, playNotificationSound, router])

  return null
}
