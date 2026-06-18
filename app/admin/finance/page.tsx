import { requireRole } from "@/lib/auth/helpers"
import { getRevenueDashboard } from "@/lib/data/revenue-dashboard"

import { FinanceDashboardClient } from "./finance-client"

export const dynamic = "force-dynamic"

export default async function FinanceDashboardPage() {
  await requireRole(["admin"])

  const revenue = await getRevenueDashboard()

  return <FinanceDashboardClient revenue={revenue} />
}
