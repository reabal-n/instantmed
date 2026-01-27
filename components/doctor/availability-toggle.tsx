"use client"

import { useState, useEffect, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Circle, ChevronDown, Loader2 } from "lucide-react"
import { toast } from "sonner"

type AvailabilityStatus = "online" | "busy" | "away"

interface AvailabilityToggleProps {
  doctorId: string
  initialStatus?: AvailabilityStatus
  onStatusChange?: (status: AvailabilityStatus) => void
}

const STATUS_CONFIG: Record<AvailabilityStatus, { label: string; color: string; bgColor: string }> = {
  online: {
    label: "Online",
    color: "text-green-500",
    bgColor: "bg-green-500",
  },
  busy: {
    label: "Busy",
    color: "text-amber-500",
    bgColor: "bg-amber-500",
  },
  away: {
    label: "Away",
    color: "text-gray-400",
    bgColor: "bg-gray-400",
  },
}

export function AvailabilityToggle({
  doctorId,
  initialStatus = "online",
  onStatusChange,
}: AvailabilityToggleProps) {
  const [status, setStatus] = useState<AvailabilityStatus>(initialStatus)
  const [isPending, startTransition] = useTransition()

  // Load status from localStorage on mount
  useEffect(() => {
    const savedStatus = localStorage.getItem(`doctor-availability-${doctorId}`)
    if (savedStatus && (savedStatus === "online" || savedStatus === "busy" || savedStatus === "away")) {
      setStatus(savedStatus)
    }
  }, [doctorId])

  const handleStatusChange = (newStatus: AvailabilityStatus) => {
    startTransition(async () => {
      setStatus(newStatus)
      localStorage.setItem(`doctor-availability-${doctorId}`, newStatus)
      
      // In a full implementation, this would call a server action to update the database
      // await updateDoctorAvailabilityAction(doctorId, newStatus)
      
      onStatusChange?.(newStatus)
      
      if (newStatus === "away") {
        toast.info("You're now marked as Away. New cases won't be assigned to you.")
      } else if (newStatus === "online") {
        toast.success("You're back online and ready to review cases.")
      }
    })
  }

  const currentConfig = STATUS_CONFIG[status]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2" disabled={isPending}>
          {isPending ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Circle className={`h-2.5 w-2.5 fill-current ${currentConfig.color}`} />
          )}
          <span>{currentConfig.label}</span>
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {(Object.keys(STATUS_CONFIG) as AvailabilityStatus[]).map((statusKey) => {
          const config = STATUS_CONFIG[statusKey]
          const isActive = status === statusKey
          return (
            <DropdownMenuItem
              key={statusKey}
              onClick={() => handleStatusChange(statusKey)}
              className="gap-2"
            >
              <Circle className={`h-2.5 w-2.5 fill-current ${config.color}`} />
              <span>{config.label}</span>
              {isActive && (
                <Badge variant="secondary" className="ml-auto text-[10px] px-1.5 py-0">
                  Current
                </Badge>
              )}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// Compact badge version for headers
export function AvailabilityBadge({ status }: { status: AvailabilityStatus }) {
  const config = STATUS_CONFIG[status]
  return (
    <div className="flex items-center gap-1.5">
      <span className={`h-2 w-2 rounded-full ${config.bgColor} animate-pulse`} />
      <span className="text-xs text-muted-foreground">{config.label}</span>
    </div>
  )
}
