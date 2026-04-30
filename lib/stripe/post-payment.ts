import { createLogger } from "@/lib/observability/logger"

const log = createLogger("stripe-post-payment")

type SupabasePostPaymentClient = {
  from: (table: string) => {
    update?: (payload: Record<string, unknown>) => {
      eq: (column: string, value: unknown) => {
        is?: (column: string, value: unknown) => PromiseLike<{ error?: { message?: string } | null }>
      }
    }
    upsert?: (
      payload: Record<string, unknown>,
      options?: Record<string, unknown>,
    ) => PromiseLike<{ error?: { message?: string } | null }>
  }
}

type PostPaymentReviewWorkInput = {
  generateDraftsForIntake: (intakeId: string) => Promise<{
    success: boolean
    error?: string
    skipped?: boolean
  }>
  intakeId: string
  schedule?: (task: () => Promise<void>) => void
  serviceCategory?: string | null
  serviceSlug?: string | null
  supabase: SupabasePostPaymentClient
}

function isMedCertPayment({
  serviceCategory,
  serviceSlug,
}: Pick<PostPaymentReviewWorkInput, "serviceCategory" | "serviceSlug">): boolean {
  return (
    serviceCategory === "medical_certificate" ||
    serviceCategory === "med_certs" ||
    Boolean(serviceSlug?.startsWith("med-cert"))
  )
}

async function queueDraftRetry(
  supabase: SupabasePostPaymentClient,
  intakeId: string,
  error: string,
): Promise<void> {
  const result = await supabase.from("ai_draft_retry_queue").upsert?.({
    intake_id: intakeId,
    attempts: 1,
    last_error: error,
    next_retry_at: new Date(Date.now() + 2 * 60 * 1000).toISOString(),
  }, { onConflict: "intake_id" })

  if (result?.error) {
    log.error("Failed to queue draft retry after payment", {
      intakeId,
      error: result.error.message,
    })
  }
}

export async function startPostPaymentReviewWork({
  generateDraftsForIntake,
  intakeId,
  schedule,
  serviceCategory,
  serviceSlug,
  supabase,
}: PostPaymentReviewWorkInput): Promise<void> {
  if (isMedCertPayment({ serviceCategory, serviceSlug })) {
    const updateResult = supabase.from("intakes").update?.({
      auto_approval_state: "awaiting_drafts",
      auto_approval_state_updated_at: new Date().toISOString(),
    })
    const scopedUpdate = updateResult?.eq("id", intakeId)
    const result = await scopedUpdate?.is?.("auto_approval_state", null)

    if (result?.error) {
      log.warn("Failed to initialize post-payment auto-approval state", {
        intakeId,
        error: result.error.message,
      })
    }
  }

  const runDraftWork = async () => {
    try {
      const result = await generateDraftsForIntake(intakeId)

      if (result.success && !("skipped" in result && result.skipped)) {
        const { markDraftsReady } = await import("@/lib/clinical/auto-approval-state")
        await markDraftsReady(supabase as never, intakeId)

        try {
          const { getFeatureFlags } = await import("@/lib/feature-flags")
          const flags = await getFeatureFlags()
          if (flags.auto_approve_delay_minutes === 0) {
            const { attemptAutoApproval } = await import("@/lib/clinical/auto-approval-pipeline")
            await attemptAutoApproval(intakeId)
          }
        } catch (autoErr) {
          log.warn("Auto-approval error after payment", {
            intakeId,
            error: autoErr instanceof Error ? autoErr.message : String(autoErr),
          })
        }
      } else if (!result.success) {
        await queueDraftRetry(supabase, intakeId, result.error || "Unknown error")
      }
    } catch (err) {
      log.error("Draft generation error after payment, queueing for retry", { intakeId }, err)
      await queueDraftRetry(
        supabase,
        intakeId,
        err instanceof Error ? err.message : String(err),
      )
    }
  }

  if (schedule) {
    schedule(runDraftWork)
    return
  }

  void runDraftWork()
}
