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
        size={compact ? "sm" : "default"}
        switchClassName="data-[state=checked]:border-[#7B8F80]/45 data-[state=checked]:bg-[#7B8F80]"
      />
      <Label
        htmlFor={compact ? "staff-availability" : "availability"}
        className={cn(
          compact ? "text-xs" : "text-sm",
          available ? "text-[#637A68]" : "text-muted-foreground",
        )}
      >
        {available ? "Available" : "Unavailable"}
      </Label>
    </div>
  )
}
