import "server-only"

import type { StaffNavCounts } from "@/lib/dashboard/staff-navigation"
import { filterSeededE2EIntakes } from "@/lib/data/seeded-e2e-data"
import { getPrescribingIdentityBlockerReport } from "@/lib/doctor/patient-identity-report"
import { createLogger } from "@/lib/observability/logger"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

const log = createLogger("staff-nav-counts")

export async function getStaffNavCounts(): Promise<StaffNavCounts> {
  const supabase = createServiceRoleClient()

  const [scriptsResult, identityResult, queueResult] = await Promise.allSettled([
    filterSeededE2EIntakes(
      supabase
        .from("intakes")
        .select("id", { count: "exact", head: true })
        .eq("payment_status", "paid")
        .eq("status", "awaiting_script"),
    ),
    getPrescribingIdentityBlockerReport(supabase),
    filterSeededE2EIntakes(
      supabase
        .from("intakes")
        .select("id", { count: "exact", head: true })
        .eq("payment_status", "paid")
        .in("status", ["paid", "in_review", "pending_info"]),
    ),
  ])

  if (scriptsResult.status === "rejected") {
    log.warn("Failed to count script-ready intakes", {}, scriptsResult.reason)
  } else if (scriptsResult.value.error) {
    log.warn("Failed to count script-ready intakes", { error: scriptsResult.value.error.message })
  }

  if (identityResult.status === "rejected") {
    log.warn("Failed to count prescribing identity blockers", {}, identityResult.reason)
  }

  if (queueResult.status === "rejected") {
    log.warn("Failed to count queue depth", {}, queueResult.reason)
  } else if (queueResult.value.error) {
    log.warn("Failed to count queue depth", { error: queueResult.value.error.message })
  }

  const identityPatients = identityResult.status === "fulfilled"
    ? new Set(identityResult.value.items.map((item) => item.patientId)).size
    : 0

  return {
    prescribingIdentityPatients: identityPatients,
    scriptsToWrite: scriptsResult.status === "fulfilled" ? scriptsResult.value.count ?? 0 : 0,
    inQueue: queueResult.status === "fulfilled" ? queueResult.value.count ?? 0 : 0,
  }
}
