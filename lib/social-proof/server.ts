import "server-only"

import { unstable_cache } from "next/cache"

import { getPatientCount } from "@/lib/social-proof"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

/**
 * Returns the real patient count from the database, cached for 1 hour.
 *
 * Counts all intakes with payment_status = 'paid' and status in
 * ('approved', 'completed') - i.e. patients who paid and received a document.
 * Falls back to the interpolated count if the DB query fails.
 *
 * SERVER-ONLY. Use /api/patient-count for client components.
 */
const getCachedPatientCount = unstable_cache(
  async () => {
    const supabase = createServiceRoleClient()
    const { count, error } = await supabase
      .from("intakes")
      .select("*", { count: "exact", head: true })
      .eq("payment_status", "paid")
      .in("status", ["approved", "completed"])

    if (error || count === null) return null
    return count
  },
  ["patient-count-db"],
  { revalidate: 3600, tags: ["patient-count"] },
)

export async function getPatientCountFromDB(): Promise<number> {
  try {
    const count = await getCachedPatientCount()
    if (count === null) return getPatientCount()
    return Math.max(count, getPatientCount())
  } catch {
    return getPatientCount()
  }
}
