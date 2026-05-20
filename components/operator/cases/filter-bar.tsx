"use client"

import { Search } from "lucide-react"

import { Input } from "@/components/ui/input"
import type { Density } from "@/lib/operator/cases/types"
import { cn } from "@/lib/utils"

import { DensityToggle } from "./density-toggle"
import { QuickFilterChip } from "./quick-filter-chip"

export type QuickFilter = {
  id: string
  label: string
  count?: number
}

type FilterBarProps = {
  searchValue: string
  onSearchChange: (next: string) => void
  searchPlaceholder?: string
  quickFilters?: QuickFilter[]
  activeFilters?: Set<string>
  onToggleFilter?: (id: string) => void
  density: Density
  onDensityChange: (next: Density) => void
  rightSlot?: React.ReactNode
  className?: string
  totalLabel?: string
}

/**
 * Composed bar above a CaseTable: search input + quick filter chips +
 * density toggle. Saved-view tabs are intentionally absent: copying the
 * URL is the saved view in v1.
 */
export function FilterBar({
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search by patient, request ID, phone, email, suburb...",
  quickFilters = [],
  activeFilters,
  onToggleFilter,
  density,
  onDensityChange,
  rightSlot,
  totalLabel,
  className,
}: FilterBarProps) {
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            type="search"
            value={searchValue}
            onChange={(e) => onSearchChange(e.currentTarget.value)}
            placeholder={searchPlaceholder}
            className="h-9 pl-9"
            aria-label="Search cases"
          />
        </div>

        {totalLabel ? (
          <span className="hidden text-xs text-muted-foreground sm:inline">
            {totalLabel}
          </span>
        ) : null}

        <DensityToggle value={density} onValueChange={onDensityChange} />

        {rightSlot}
      </div>

      {quickFilters.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5">
          {quickFilters.map((filter) => (
            <QuickFilterChip
              key={filter.id}
              label={filter.label}
              count={filter.count}
              active={Boolean(activeFilters?.has(filter.id))}
              onClick={() => onToggleFilter?.(filter.id)}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}
