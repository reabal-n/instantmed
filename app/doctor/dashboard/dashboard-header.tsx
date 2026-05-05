"use client"

import { AlertTriangle } from "lucide-react"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { setDoctorAvailabilityAction } from "@/app/actions/doctor-availability"
import { DashboardPageHeader } from "@/components/dashboard"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

interface DashboardHeaderProps {
  initialAvailable: boolean
}

export function DashboardHeader({ initialAvailable }: DashboardHeaderProps) {
  const [available, setAvailable] = useState(initialAvailable)
  const [isPending, startTransition] = useTransition()

  const handleToggle = (checked: boolean) => {
    setAvailable(checked)
    startTransition(async () => {
      const result = await setDoctorAvailabilityAction(checked)
      if (!result.success) {
        setAvailable(!checked) // revert
        toast.error(result.error || "Failed to update availability")
      }
    })
  }

  return (
    <>
      <DashboardPageHeader
        title="Review Queue"
        description="Patient requests awaiting your review"
        actions={
          <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-card px-3 py-2">
            <Switch
              id="availability"
              checked={available}
              onCheckedChange={handleToggle}
              disabled={isPending}
            />
            <Label
              htmlFor="availability"
              className={`text-sm ${available ? "text-success" : "text-muted-foreground"}`}
            >
              {available ? "Available" : "Unavailable"}
            </Label>
          </div>
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
