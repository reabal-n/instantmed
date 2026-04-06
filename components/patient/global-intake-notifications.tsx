"use client"

import { useEffect, useRef } from "react"
import { useRouter, usePathname } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"

interface GlobalIntakeNotificationsProps {
  patientId: string
}

const STATUS_MESSAGES: Record<string, { title: string; description: string; type: "success" | "info" | "warning" }> = {
  pending_info: {
    title: "Your doctor has a question",
    description: "Additional information is needed before your request can be approved.",
    type: "info",
  },
  approved: {
    title: "Request approved",
    description: "Your document is ready. Head to your dashboard to download it.",
    type: "success",
  },
  declined: {
    title: "Request declined",
    description: "Check your email for the reason and next steps.",
    type: "warning",
  },
  in_review: {
    title: "Under review",
    description: "A doctor is now looking at your request.",
    type: "info",
  },
  awaiting_script: {
    title: "Prescription approved",
    description: "Your eScript is being prepared. Watch for an SMS.",
    type: "success",
  },
  completed: {
    title: "Request complete",
    description: "Your request has been fully processed.",
    type: "success",
  },
}

export function GlobalIntakeNotifications({ patientId }: GlobalIntakeNotificationsProps) {
  const router = useRouter()
  const pathname = usePathname()
  // Track last-known statuses to only notify on actual changes
  const knownStatuses = useRef<Record<string, string>>({})

  // Keep refs in sync so the subscription callback always reads the latest values
  // without needing them in the dependency array
  const pathnameRef = useRef(pathname)
  useEffect(() => { pathnameRef.current = pathname }, [pathname])

  const routerRef = useRef(router)
  useEffect(() => { routerRef.current = router }, [router])

  useEffect(() => {
    if (!patientId) return

    const supabase = createClient()

    const channel = supabase
      .channel(`global-intake-status-${patientId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "intakes",
          filter: `patient_id=eq.${patientId}`,
        },
        (payload) => {
          const intakeId = payload.new.id as string
          const newStatus = payload.new.status as string
          const prevStatus = knownStatuses.current[intakeId]

          // Skip if status hasn't changed or we're already on this intake's page
          if (newStatus === prevStatus) return
          if (pathnameRef.current === `/patient/intakes/${intakeId}`) return

          knownStatuses.current[intakeId] = newStatus

          const message = STATUS_MESSAGES[newStatus]
          if (!message) return

          const toastFn =
            message.type === "success"
              ? toast.success
              : message.type === "warning"
                ? toast.warning
                : toast.info

          toastFn(message.title, {
            description: message.description,
            action: {
              label: "View",
              onClick: () => routerRef.current.push(`/patient/intakes/${intakeId}`),
            },
            duration: 8000,
          })

          // Refresh dashboard data
          routerRef.current.refresh()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [patientId])

  return null
}
