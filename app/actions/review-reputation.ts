"use server"

import { PRODUCT_REVIEW_TOTAL_METRIC_NAME } from "@/lib/admin/review-request-funnel"
import { requireRoleOrNull } from "@/lib/auth/helpers"
import { revalidateStaff } from "@/lib/dashboard/revalidate-staff"
import { STAFF_ANALYTICS_HREF } from "@/lib/dashboard/routes"
import { checkServerActionRateLimit } from "@/lib/rate-limit/redis"
import { logAuditEvent } from "@/lib/security/audit-log"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import type { ActionResult } from "@/types/shared"

const MAX_PRODUCT_REVIEW_TOTAL = 1_000_000
const INVALID_TOTAL_ERROR = "Enter a whole review total between 0 and 1,000,000."
const INSERT_ERROR = "Could not record the external review total. Try again."

export async function recordProductReviewTotalAction(
  total: unknown,
): Promise<ActionResult<{ total: number }>> {
  const authResult = await requireRoleOrNull(["admin"])
  if (!authResult) {
    return { success: false, error: "Unauthorized" }
  }

  const rateLimit = await checkServerActionRateLimit(
    `admin:${authResult.profile.id}:productreview-total-snapshot`,
    "admin",
  )
  if (!rateLimit.success) {
    return {
      success: false,
      error: rateLimit.error || "Too many requests. Please wait and try again.",
    }
  }

  if (!Number.isInteger(total) || (total as number) < 0 || (total as number) > MAX_PRODUCT_REVIEW_TOTAL) {
    return { success: false, error: INVALID_TOTAL_ERROR }
  }

  const aggregateTotal = total as number
  let insertFailed = false
  try {
    const supabase = createServiceRoleClient()
    const { error } = await supabase.from("operational_metrics").insert({
      metric_name: PRODUCT_REVIEW_TOTAL_METRIC_NAME,
      metric_value: aggregateTotal,
      dimensions: {
        platform: "productreview",
        source: "manual_admin_snapshot",
      },
    })
    insertFailed = Boolean(error)
  } catch {
    insertFailed = true
  }

  if (insertFailed) {
    await logAuditEvent({
      action: "admin_action",
      actorId: authResult.profile.id,
      actorType: "admin",
      metadata: {
        action_type: "productreview_review_total_recorded",
        metric_name: PRODUCT_REVIEW_TOTAL_METRIC_NAME,
        metric_value: aggregateTotal,
        status: "failed",
        error_code: "operational_metric_insert_failed",
      },
    })
    return { success: false, error: INSERT_ERROR }
  }

  await logAuditEvent({
    action: "admin_action",
    actorId: authResult.profile.id,
    actorType: "admin",
    metadata: {
      action_type: "productreview_review_total_recorded",
      metric_name: PRODUCT_REVIEW_TOTAL_METRIC_NAME,
      metric_value: aggregateTotal,
      status: "recorded",
    },
  })

  revalidateStaff({ paths: [STAFF_ANALYTICS_HREF] })
  return { success: true, data: { total: aggregateTotal } }
}
