import { revalidateTag } from "next/cache"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { attemptAutoApproval } from "@/lib/clinical/auto-approval-pipeline"
import { verifyE2ESecret } from "@/lib/dev-only-route-auth"
import { isAllowedDevOnlyRequest } from "@/lib/dev-only-routes"
import { startPostPaymentReviewWork } from "@/lib/stripe/post-payment"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

/**
 * E2E-only immediate auto-approval harness.
 *
 * Production auto-approval is delayed by the configured retry-auto-approval cron
 * gate. This route intentionally bypasses that wait so the paid med-cert
 * pipeline test can deterministically verify draft sync, approval, PDF storage,
 * and outbox logging in one test run.
 */

const PayloadSchema = z.object({
  intakeId: z.string().uuid(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

async function seedReadyClinicalNoteDraft(intakeId: string, startDate: string) {
  const { error } = await createServiceRoleClient()
    .from("document_drafts")
    .upsert(
      {
        intake_id: intakeId,
        request_id: intakeId,
        type: "clinical_note",
        content: {
          presentingComplaint: "Mild cold symptoms with runny nose, sore throat, tiredness and low energy.",
          historyOfPresentIllness: "One day history. Symptoms are mild and stable based on the structured intake fixture.",
          relevantInformation: "No high-risk category was selected in this E2E low-risk fixture.",
          certificateDetails: `Standard work certificate requested for one day from ${startDate}.`,
          flags: {
            requiresReview: false,
            flagReason: null,
          },
        },
        is_ai_generated: true,
        model: "e2e-static-clinical-note",
        status: "ready",
        prompt_tokens: 0,
        completion_tokens: 0,
        generation_duration_ms: 0,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "intake_id,type" }
    )

  if (error) {
    throw new Error(`Failed to seed ready clinical note draft: ${error.message}`)
  }
}

export async function POST(request: NextRequest) {
  if (!isAllowedDevOnlyRequest(request)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const secret = verifyE2ESecret(request)
  if (!secret.ok) {
    return NextResponse.json({ error: secret.error }, { status: secret.status })
  }

  const parsed = PayloadSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
  }

  const { intakeId, startDate } = parsed.data
  const supabase = createServiceRoleClient()
  const scheduledTasks: Promise<void>[] = []

  revalidateTag("feature-flags")

  await startPostPaymentReviewWork({
    generateDraftsForIntake: async (draftIntakeId) => {
      await seedReadyClinicalNoteDraft(draftIntakeId, startDate)
      return { success: true }
    },
    intakeId,
    schedule: (task) => {
      scheduledTasks.push(task())
    },
    serviceCategory: "medical_certificate",
    serviceSlug: "med-cert-sick",
    supabase: supabase as never,
  })

  await Promise.all(scheduledTasks)

  const result = await supabase
    .from("intakes")
    .select("status, ai_approved, auto_approval_state")
    .eq("id", intakeId)
    .single()

  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: 500 })
  }

  let intake = result.data

  if (intake?.status === "paid" && intake.auto_approval_state === "pending") {
    await attemptAutoApproval(intakeId)
    const refreshed = await supabase
      .from("intakes")
      .select("status, ai_approved, auto_approval_state")
      .eq("id", intakeId)
      .single()

    if (refreshed.error) {
      return NextResponse.json({ error: refreshed.error.message }, { status: 500 })
    }

    intake = refreshed.data
  }

  return NextResponse.json({
    mode: "e2e_immediate_auto_approval",
    productionDelayBypassed: true,
    success: intake?.status === "approved" && intake.ai_approved === true,
    status: intake?.status,
    autoApprovalState: intake?.auto_approval_state,
  })
}
