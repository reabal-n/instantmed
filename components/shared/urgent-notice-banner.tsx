"use client"

import { AlertTriangle } from "lucide-react"

import { useServiceAvailability } from "@/components/providers/service-availability-provider"

export function UrgentNoticeBanner() {
  const { urgentNotice } = useServiceAvailability()

  if (!urgentNotice.enabled || !urgentNotice.message.trim()) return null

  return (
    <div className="sticky top-0 z-50 w-full border-b border-warning-border bg-warning-light px-4 py-2.5 flex items-center justify-center gap-2">
      <AlertTriangle className="w-4 h-4 text-warning shrink-0" />
      <p className="text-sm text-warning font-medium">
        {urgentNotice.message}
      </p>
    </div>
  )
}
