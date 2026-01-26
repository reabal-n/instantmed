import { requireRole } from "@/lib/auth"
import { getStuckIntakes, getDistinctServiceTypes } from "@/lib/data/intake-ops"
import { IntakesStuckClient } from "./intakes-stuck-client"

export const dynamic = "force-dynamic"

interface PageProps {
  searchParams: Promise<{
    reason?: string
    service_type?: string
    status?: string
  }>
}

export default async function IntakesStuckPage({ searchParams }: PageProps) {
  // Require doctor or admin role
  await requireRole(["doctor", "admin"])

  const params = await searchParams

  const filters = {
    reason: params.reason as "paid_no_review" | "review_timeout" | "delivery_pending" | "delivery_failed" | undefined,
    service_type: params.service_type,
    status: params.status,
  }

  // Fetch data in parallel
  const [result, serviceTypes] = await Promise.all([
    getStuckIntakes(filters),
    getDistinctServiceTypes(),
  ])

  return (
    <IntakesStuckClient
      initialData={result.data}
      counts={result.counts}
      serviceTypes={serviceTypes}
      filters={filters}
      error={result.error}
    />
  )
}
