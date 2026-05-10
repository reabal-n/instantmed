"use client"

import { AlertTriangle } from "lucide-react"
import { useState } from "react"

import { DashboardPageHeader } from "@/components/dashboard"
import { DoctorAvailabilityToggle } from "@/components/doctor/doctor-availability-toggle"

interface DashboardHeaderProps {
  initialAvailable: boolean
}

export function DashboardHeader({ initialAvailable }: DashboardHeaderProps) {
  const [available, setAvailable] = useState(initialAvailable)

  return (
    <>
      <DashboardPageHeader
        title="Queue"
        description="Clinical cases awaiting review"
        actions={
          <DoctorAvailabilityToggle
            initialAvailable={initialAvailable}
            onAvailabilityChange={setAvailable}
          />
        }
      />

      {/* Unavailable Banner */}
      {!available && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <p className="text-sm text-amber-800 dark:text-amber-300">
            You are currently <strong>unavailable</strong>. New requests will not be auto-assigned to you. Toggle back when ready to review.
          </p>
        </div>
      )}
    </>
  )
}
