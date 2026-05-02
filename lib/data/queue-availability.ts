"use server"

/**
 * Queue Availability - Estimates doctor response time based on pending intakes
 */

import { createServiceRoleClient } from "@/lib/supabase/service-role"

export interface QueueEstimate {
  pendingCount: number
  estimatedWait: string
}

/**
 * Get estimated wait time based on current queue depth
 */
export async function getQueueEstimate(): Promise<QueueEstimate> {
  try {
    const supabase = createServiceRoleClient()

    const { count, error } = await supabase
      .from("intakes")
      .select("id", { count: "exact", head: true })
      .in("status", ["paid", "in_review"])

    if (error) {
      return { pendingCount: 0, estimatedWait: "Doctor review" }
    }

    const pendingCount = count || 0

    let estimatedWait: string
    if (pendingCount <= 5) {
      estimatedWait = "Doctor review"
    } else if (pendingCount <= 15) {
      estimatedWait = "Doctor review"
    } else if (pendingCount <= 30) {
      estimatedWait = "Doctor review"
    } else {
      estimatedWait = "Doctor review"
    }

    return { pendingCount, estimatedWait }
  } catch {
    return { pendingCount: 0, estimatedWait: "Doctor review" }
  }
}
