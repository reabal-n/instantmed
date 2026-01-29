"use client"

import { useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface IntakeStatusListenerProps {
  intakeId: string
  patientId: string
  currentStatus: string
}

const statusMessages: Record<string, { title: string; description: string; type: "success" | "info" | "warning" }> = {
  approved: {
    title: "Request Approved",
    description: "Your request has been approved by a doctor.",
    type: "success",
  },
  declined: {
    title: "Request Declined", 
    description: "Your request could not be approved. Check your email for details.",
    type: "warning",
  },
  pending_info: {
    title: "More Information Needed",
    description: "The doctor needs additional information. Please check your request.",
    type: "info",
  },
  completed: {
    title: "Request Complete",
    description: "Your request has been fully processed.",
    type: "success",
  },
  in_review: {
    title: "Under Review",
    description: "A doctor is now reviewing your request.",
    type: "info",
  },
  awaiting_script: {
    title: "Prescription Processing",
    description: "Your prescription is being prepared.",
    type: "info",
  },
}

export function IntakeStatusListener({ intakeId, patientId, currentStatus }: IntakeStatusListenerProps) {
  const router = useRouter()
  const lastStatusRef = useRef(currentStatus)

  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel(`intake-status-${intakeId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "intakes",
          filter: `id=eq.${intakeId}`,
        },
        (payload) => {
          const newStatus = payload.new.status as string
          const oldStatus = lastStatusRef.current

          // Only notify on actual status changes
          if (newStatus !== oldStatus) {
            lastStatusRef.current = newStatus
            
            const message = statusMessages[newStatus]
            if (message) {
              if (message.type === "success") {
                toast.success(message.title, { description: message.description })
              } else if (message.type === "warning") {
                toast.warning(message.title, { description: message.description })
              } else {
                toast.info(message.title, { description: message.description })
              }
            }

            // Refresh the page to show updated status
            router.refresh()
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [intakeId, patientId, router])

  // This component doesn't render anything visible
  return null
}
