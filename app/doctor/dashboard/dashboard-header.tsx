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
          <>
            <div className="flex items-center gap-2">
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
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
              <kbd className="px-1.5 py-0.5 rounded border border-border/40 bg-muted/40">j</kbd>
              <kbd className="px-1.5 py-0.5 rounded border border-border/40 bg-muted/40">k</kbd>
              <span className="text-muted-foreground">navigate</span>
              <span className="mx-1 text-muted-foreground/40">·</span>
              <kbd className="px-1.5 py-0.5 rounded border border-border/40 bg-muted/40">a</kbd>
              <span className="text-muted-foreground">approve</span>
              <span className="mx-1 text-muted-foreground/40">·</span>
              <kbd className="px-1.5 py-0.5 rounded border border-border/40 bg-muted/40">d</kbd>
              <span className="text-muted-foreground">decline</span>
            </div>
          </>
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
