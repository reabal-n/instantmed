import { requireRole } from "@/lib/auth"
import { getDoctorMetrics } from "@/lib/data/doctor-ops"
import { DoctorOpsClient } from "./doctor-ops-client"
import type { DateRange, SortField, SortDirection } from "@/lib/data/doctor-ops"

export const dynamic = "force-dynamic"

interface PageProps {
  searchParams: Promise<{
    range?: string
    sort?: string
    dir?: string
  }>
}

export default async function DoctorOpsPage({ searchParams }: PageProps) {
  await requireRole(["doctor", "admin"])

  const params = await searchParams

  const dateRange = (params.range === "30d" ? "30d" : "7d") as DateRange
  const sortField = (params.sort || "pending_count") as SortField
  const sortDirection = (params.dir === "asc" ? "asc" : "desc") as SortDirection

  const result = await getDoctorMetrics({
    dateRange,
    sortField,
    sortDirection,
  })

  return (
    <DoctorOpsClient
      initialData={result.data}
      dateRange={dateRange}
      sortField={sortField}
      sortDirection={sortDirection}
      error={result.error}
    />
  )
}
