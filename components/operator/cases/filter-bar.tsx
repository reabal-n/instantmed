"use client"

import { Search, SlidersHorizontal } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
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
  filterControls?: React.ReactNode
  filterSummary?: string
  rightSlot?: React.ReactNode
  className?: string
  totalLabel?: string
  searchInputRef?: React.Ref<HTMLInputElement>
}

/**
 * Composed bar above a CaseTable: search input + quick filter chips +
 * optional consolidated filters. Private search terms stay in local component state.
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
  filterControls,
  filterSummary,
  totalLabel,
  searchInputRef,
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
            ref={searchInputRef}
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

        {filterControls ? (
          <Popover>
            <PopoverTrigger asChild>
              <Button type="button" variant="outline" className="min-h-11 shrink-0" aria-label="Filters">
                <SlidersHorizontal className="h-4 w-4" aria-hidden="true" /> Filters
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" aria-label="Request filters" className="space-y-4 bg-card dark:bg-card backdrop-blur-none dark:backdrop-blur-none">
              {filterControls}
              <div className="space-y-2">
                <p className="text-sm font-medium">Row density</p>
                <DensityToggle value={density} onValueChange={onDensityChange} className="[&_button]:h-11 [&_button]:w-11" />
              </div>
            </PopoverContent>
          </Popover>
        ) : <DensityToggle value={density} onValueChange={onDensityChange} />}

        {rightSlot}
      </div>

      {filterSummary ? <p className="text-xs text-muted-foreground" aria-label="Active filters">{filterSummary}</p> : null}

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
