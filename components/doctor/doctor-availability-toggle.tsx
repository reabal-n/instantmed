"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"

import { setDoctorAvailabilityAction } from "@/app/actions/doctor-availability"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"

interface DoctorAvailabilityToggleProps {
  initialAvailable: boolean
  compact?: boolean
  onAvailabilityChange?: (available: boolean) => void
}

export function DoctorAvailabilityToggle({
  initialAvailable,
  compact = false,
  onAvailabilityChange,
}: DoctorAvailabilityToggleProps) {
  const [available, setAvailable] = useState(initialAvailable)
  const [isPending, startTransition] = useTransition()

  const handleToggle = (checked: boolean) => {
    setAvailable(checked)
    onAvailabilityChange?.(checked)
    startTransition(async () => {
      const result = await setDoctorAvailabilityAction(checked)
      if (!result.success) {
        setAvailable(!checked)
        onAvailabilityChange?.(!checked)
        toast.error(result.error || "Failed to update availability")
      }
    })
  }

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-xl border border-border/60 bg-card",
        compact ? "px-2.5 py-1.5" : "px-3 py-2",
      )}
    >
      <Switch
        id={compact ? "staff-availability" : "availability"}
        checked={available}
        onCheckedChange={handleToggle}
        disabled={isPending}
      />
      <Label
        htmlFor={compact ? "staff-availability" : "availability"}
        className={cn(
          "text-sm",
          available ? "text-success" : "text-muted-foreground",
        )}
      >
        {available ? "Available" : "Unavailable"}
      </Label>
    </div>
  )
}
