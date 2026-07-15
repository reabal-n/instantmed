"use client"

import { usePathname, useRouter } from "next/navigation"
import { useCallback, useEffect, useRef } from "react"
import { toast } from "sonner"

import { usePatientIntakeStatusPolling } from "@/components/patient/intake-status-listener"
import { buildPatientIntakeHref } from "@/lib/dashboard/routes"
import type { PatientIntakePollingChange } from "@/lib/patient/intake-status-polling"

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
  escalated: {
    title: "Additional review needed",
    description: "Your request needs additional review. We will update you when there is a decision.",
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

const MORE_INFORMATION_MESSAGE = {
  title: "More information needed",
  description: "Open your saved request to see the safe next step.",
  type: "info" as const,
}

function getPatientUpdateMessage(change: PatientIntakePollingChange) {
  if (
    change.current.payment_recovery_reason === "more_information_required" &&
    change.previous.payment_recovery_reason !== "more_information_required"
  ) {
    return MORE_INFORMATION_MESSAGE
  }
  if (change.current.status !== change.previous.status) {
    return STATUS_MESSAGES[change.current.status]
  }
  return undefined
}

export function GlobalIntakeNotifications() {
  const router = useRouter()
  const pathname = usePathname()
  const pathnameRef = useRef(pathname)
  const routerRef = useRef(router)

  useEffect(() => {
    pathnameRef.current = pathname
  }, [pathname])

  useEffect(() => {
    routerRef.current = router
  }, [router])

  const handleChanges = useCallback((changes: PatientIntakePollingChange[]) => {
    for (const change of changes) {
      const intakeHref = buildPatientIntakeHref(change.current.id)

      // The current detail route should refresh even when the lifecycle status
      // is unchanged and only the safe payment-recovery reason changed. Avoid a
      // duplicate toast there because the refreshed detail surface is primary.
      if (pathnameRef.current === intakeHref) continue

      const message = getPatientUpdateMessage(change)
      if (!message) continue

      const toastFn =
        message.type === "success"
          ? toast.success
          : message.type === "warning"
            ? toast.warning
            : toast.info

      toastFn(message.title, {
        action: {
          label: "View",
          onClick: () => routerRef.current.push(intakeHref),
        },
        description: message.description,
        duration: 8000,
        id: `patient-intake-${change.current.id}-${change.current.status}-${change.current.payment_recovery_reason ?? "none"}`,
      })
    }

    // One server refresh updates list, dashboard, and the current detail route
    // from their canonical patient-safe projections.
    routerRef.current.refresh()
  }, [])

  usePatientIntakeStatusPolling({ onChanges: handleChanges })

  return null
}
