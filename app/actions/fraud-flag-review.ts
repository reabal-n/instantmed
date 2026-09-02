"use server"

import { z } from "zod"

import { withServerAction } from "@/lib/actions/with-server-action"
import { resolveFraudFlagReview } from "@/lib/admin/fraud-flag-review"
import { revalidateStaff } from "@/lib/dashboard/revalidate-staff"
import { checkServerActionRateLimit } from "@/lib/rate-limit/redis"
import type { ActionResult } from "@/types/shared"

const inputSchema = z.object({
  flagId: z.string().uuid("Invalid fraud flag ID"),
  outcome: z.enum(["reviewed", "dismissed"]),
})

interface FraudFlagReviewActionData {
  outcome: "reviewed" | "dismissed"
}

export const resolveFraudFlagReviewAction = withServerAction<
  z.infer<typeof inputSchema>,
  FraudFlagReviewActionData
>(
  { roles: ["admin"], name: "fraud-flag-review" },
  async (input, { supabase, profile, log }): Promise<ActionResult<FraudFlagReviewActionData>> => {
    const parsed = inputSchema.safeParse(input)
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid review outcome" }
    }

    const rateLimit = await checkServerActionRateLimit(
      `admin:${profile.id}:fraud-flag-review`,
      "admin",
    )
    if (!rateLimit.success) {
      return { success: false, error: rateLimit.error || "Too many requests. Please wait and try again." }
    }

    const result = await resolveFraudFlagReview(
      supabase,
      parsed.data.flagId,
      profile.id,
      parsed.data.outcome,
    )
    if (result.queryFailed) {
      log.error("Fraud flag review update failed")
      return { success: false, error: "Could not save the review outcome. Nothing was changed." }
    }
    if (result.outcome === "not_open") {
      return { success: false, error: "This fraud flag is no longer open. Refresh Operations." }
    }

    revalidateStaff({ ops: true })
    log.info("Fraud flag review outcome recorded", { outcome: parsed.data.outcome })
    return { success: true, data: { outcome: parsed.data.outcome } }
  },
)
