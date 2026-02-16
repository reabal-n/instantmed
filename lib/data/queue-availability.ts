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
      .select("*", { count: "exact", head: true })
      .in("status", ["paid", "in_review"])

    if (error) {
      return { pendingCount: 0, estimatedWait: "~1 hour" }
    }

    const pendingCount = count || 0

    let estimatedWait: string
    if (pendingCount <= 5) {
      estimatedWait = "~15 minutes"
    } else if (pendingCount <= 15) {
      estimatedWait = "~30 minutes"
    } else if (pendingCount <= 30) {
      estimatedWait = "~1 hour"
    } else {
      estimatedWait = "~2 hours"
    }

    return { pendingCount, estimatedWait }
  } catch {
    return { pendingCount: 0, estimatedWait: "~1 hour" }
  }
}
