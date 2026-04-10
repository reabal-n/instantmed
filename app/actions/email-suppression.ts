"use server"

import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { requireRole } from "@/lib/auth"
import { createLogger } from "@/lib/observability/logger"

const logger = createLogger("email-suppression")

export interface SuppressedEmail {
  profileId: string
  email: string
  fullName: string | null
  bounceReason: string | null
  bouncedAt: string | null
  deliveryFailures: number
  source: "bounce" | "complaint"
}

/**
 * Fetch all suppressed email addresses (bounced or complained profiles).
 * Doctor/admin only.
 */
export async function getSuppressedEmails(): Promise<{
  data: SuppressedEmail[]
  error?: string
}> {
  try {
    await requireRole(["admin", "doctor"])
    const supabase = createServiceRoleClient()

    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, full_name, email_bounced, email_bounce_reason, email_bounced_at, email_delivery_failures")
      .eq("email_bounced", true)
      .order("email_bounced_at", { ascending: false, nullsFirst: false })
      .limit(200)

    if (error) {
      logger.error("Failed to fetch suppressed emails", { error: error.message })
      return { data: [], error: error.message }
    }

    const suppressed: SuppressedEmail[] = (data || []).map((row) => ({
      profileId: row.id,
      email: row.email,
      fullName: row.full_name,
      bounceReason: row.email_bounce_reason,
      bouncedAt: row.email_bounced_at,
      deliveryFailures: row.email_delivery_failures || 0,
      source: row.email_bounce_reason?.startsWith("complaint") ? "complaint" : "bounce",
    }))

    return { data: suppressed }
  } catch (error) {
    logger.error("Failed to fetch suppressed emails", { error })
    return { data: [], error: "Failed to fetch suppressed emails" }
  }
}

/**
 * Clear bounce flag for a specific profile, re-enabling email delivery.
 * Doctor/admin only.
 */
export async function clearBounceFlag(profileId: string): Promise<{
  success: boolean
  error?: string
}> {
  try {
    await requireRole(["admin", "doctor"])
    const supabase = createServiceRoleClient()

    const { error } = await supabase
      .from("profiles")
      .update({
        email_bounced: false,
        email_bounce_reason: null,
        email_delivery_failures: 0,
      })
      .eq("id", profileId)

    if (error) {
      logger.error("Failed to clear bounce flag", { profileId, error: error.message })
      return { success: false, error: error.message }
    }

    logger.info("Bounce flag cleared", { profileId })
    return { success: true }
  } catch (error) {
    logger.error("Failed to clear bounce flag", { error })
    return { success: false, error: "Failed to clear bounce flag" }
  }
}
