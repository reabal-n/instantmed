"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ADMIN_INTAKE_STATUS_FILTER_OPTIONS,
  type AdminIntakeStatusFilterValue,
} from "@/lib/dashboard/admin-work-lanes"
import { formatIntakeStatus } from "@/lib/format/intake"
import {
  ADMIN_SERVICE_FILTER_OPTIONS,
  type AdminServiceFilterValue,
} from "@/lib/services/service-presentation"

export type LedgerFilterSelectsProps = {
  onServiceChange: (value: AdminServiceFilterValue) => void
  onStatusChange: (value: AdminIntakeStatusFilterValue) => void
  service: AdminServiceFilterValue
  status: AdminIntakeStatusFilterValue
}

export function LedgerFilterSelects({
  onServiceChange,
  onStatusChange,
  service,
  status,
}: LedgerFilterSelectsProps) {
  return (
    <div className="grid grid-cols-2 gap-2 lg:mb-[35px] lg:flex">
      <Select value={service} onValueChange={onServiceChange}>
        <SelectTrigger className="min-h-10 min-w-0 lg:w-[190px]" aria-label="Service filter">
          <SelectValue placeholder="All services" />
        </SelectTrigger>
        <SelectContent>
          {ADMIN_SERVICE_FILTER_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={status} onValueChange={onStatusChange}>
        <SelectTrigger className="min-h-10 min-w-0 lg:w-[175px]" aria-label="Status filter">
          <SelectValue placeholder="All statuses" />
        </SelectTrigger>
        <SelectContent>
          {ADMIN_INTAKE_STATUS_FILTER_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.value === "all" ? "All statuses" : formatIntakeStatus(option.value)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
