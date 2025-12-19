'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Filter, X } from 'lucide-react'

interface QueueFiltersProps {
  currentStatus?: string
  currentService?: string
  currentRisk?: string
}

export function QueueFilters({
  currentStatus,
  currentService,
  currentRisk,
}: QueueFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const updateFilter = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString())
    
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    
    // Clear the quick filter when using detailed filters
    params.delete('filter')
    
    router.push(`/admin/queue?${params.toString()}`)
  }

  const clearFilters = () => {
    router.push('/admin/queue')
  }

  const hasFilters = currentStatus || currentService || currentRisk

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Filter className="w-4 h-4 text-muted-foreground" />

      {/* Status Filter */}
      <Select
        value={currentStatus || 'all'}
        onValueChange={(v) => updateFilter('status', v === 'all' ? null : v)}
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Status</SelectItem>
          <SelectItem value="paid">In Queue</SelectItem>
          <SelectItem value="in_review">Reviewing</SelectItem>
          <SelectItem value="pending_info">Awaiting Info</SelectItem>
        </SelectContent>
      </Select>

      {/* Service Filter */}
      <Select
        value={currentService || 'all'}
        onValueChange={(v) => updateFilter('service', v === 'all' ? null : v)}
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Service" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Services</SelectItem>
          <SelectItem value="weight-loss">Weight Loss</SelectItem>
          <SelectItem value="med-cert">Med Certificates</SelectItem>
          <SelectItem value="mens-health">Men's Health</SelectItem>
          <SelectItem value="common-scripts">Common Scripts</SelectItem>
        </SelectContent>
      </Select>

      {/* Risk Tier Filter */}
      <Select
        value={currentRisk || 'all'}
        onValueChange={(v) => updateFilter('risk', v === 'all' ? null : v)}
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Risk" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Risk</SelectItem>
          <SelectItem value="low">Low</SelectItem>
          <SelectItem value="moderate">Moderate</SelectItem>
          <SelectItem value="high">High</SelectItem>
          <SelectItem value="critical">Critical</SelectItem>
        </SelectContent>
      </Select>

      {/* Clear Filters */}
      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters}>
          <X className="w-4 h-4 mr-1" />
          Clear
        </Button>
      )}
    </div>
  )
}
