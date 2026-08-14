"use server"

import * as Sentry from "@sentry/nextjs"
import { z } from "zod"

import { withServerAction } from "@/lib/actions/with-server-action"
import {
  type HistoricalAutoIssuedReviewReceiptOutcome,
  recordHistoricalAutoIssuedNoCorrection,
} from "@/lib/admin/historical-auto-issued-review"
import { doctorHasCapability } from "@/lib/auth/staff-capabilities"
import { revalidateStaff } from "@/lib/dashboard/revalidate-staff"
import type { ActionResult } from "@/types/shared"

const inputSchema = z.object({
  intakeId: z.string().uuid("Invalid request ID"),
})

const OUTCOME_ERRORS: Record<
  Exclude<HistoricalAutoIssuedReviewReceiptOutcome, "recorded" | "already_recorded">,
  string
> = {
  actor_not_authorized: "You are not authorised to record this review.",
  case_not_found: "This request is not part of the fixed historical review cohort.",
  case_not_opened: "Reload this review before recording an outcome.",
  case_state_changed: "The certificate changed while it was being reviewed. Reload and check its current state.",
  correction_started: "This certificate has already been returned for correction.",
  cohort_mismatch: "This retrospective is paused because its fixed cohort changed. Nothing was recorded; contact the operator.",
}

interface ReceiptData {
  outcome: "recorded" | "already_recorded"
}

export const recordHistoricalAutoIssuedNoCorrectionAction = withServerAction<
  { intakeId: string },
  ReceiptData
>(
  { roles: ["admin"], name: "historical-auto-issued-no-correction" },
  async (input, { supabase, profile, log }): Promise<ActionResult<ReceiptData>> => {
    const parsed = inputSchema.safeParse(input)
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid request ID" }
    }

    if (!doctorHasCapability(profile, "review_med_certs")) {
      return {
        success: false,
        error: "You are not authorised to review medical certificates.",
      }
    }

    const result = await recordHistoricalAutoIssuedNoCorrection(
      supabase,
      parsed.data.intakeId,
      profile.id,
    )

    if (result.queryFailed || !result.outcome) {
      log.error("Historical auto-issued review receipt failed", {
        intakeId: parsed.data.intakeId,
      })
      Sentry.captureMessage("Historical auto-issued review receipt failed", {
        level: "error",
        tags: {
          subsystem: "historical-auto-issued-review",
          intake_id: parsed.data.intakeId,
        },
      })
      return {
        success: false,
        error: "The review receipt could not be recorded. Nothing was changed; reload and try again.",
      }
    }

    if (result.outcome !== "recorded" && result.outcome !== "already_recorded") {
      log.warn("Historical auto-issued review receipt refused", {
        intakeId: parsed.data.intakeId,
        outcome: result.outcome,
      })
      return { success: false, error: OUTCOME_ERRORS[result.outcome] }
    }

    revalidateStaff({ intakeId: parsed.data.intakeId, ops: true })
    log.info("Historical auto-issued review receipt recorded", {
      intakeId: parsed.data.intakeId,
      outcome: result.outcome,
    })

    return { success: true, data: { outcome: result.outcome } }
  },
)
