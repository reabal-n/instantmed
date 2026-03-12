"use client"

import { useServiceAvailability } from "@/components/providers/service-availability-provider"
import { AlertTriangle } from "lucide-react"

export function UrgentNoticeBanner() {
  const { urgentNotice } = useServiceAvailability()

  if (!urgentNotice.enabled || !urgentNotice.message.trim()) return null

  return (
    <div className="sticky top-0 z-50 w-full border-b border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/50 px-4 py-2.5 flex items-center justify-center gap-2">
      <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
      <p className="text-sm text-amber-900 dark:text-amber-100 font-medium">
        {urgentNotice.message}
      </p>
    </div>
  )
}
