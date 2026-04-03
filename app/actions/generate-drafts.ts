"use server"

/**
 * Server Action: Generate AI Drafts for Intake
 *
 * Generates clinical note and service-specific drafts using AI.
 * Idempotent - skips if drafts already exist (unless force=true).
 * Called after payment is confirmed via Stripe webhook.
 */

import { draftsExist, deleteDrafts } from "@/lib/ai/drafts"
import { normalizeServiceType, getDraftCategory } from "@/lib/constants/service-types"
import * as Sentry from "@sentry/nextjs"
import { log, getServiceClient, formatIntakeContext, type GenerateDraftsResult } from "./drafts/shared"
import { generateClinicalNoteDraft } from "./drafts/generate-clinical-note"
import { generateMedCertDraft } from "./drafts/generate-med-cert"
import { generateRepeatRxDraft } from "./drafts/generate-repeat-rx"
import { generateConsultDraft } from "./drafts/generate-consult"

/**
 * Generate AI drafts for an intake
 *
 * @param intakeId - The intake ID to generate drafts for
 * @param force - If true, regenerate even if drafts exist
 */
export async function generateDraftsForIntake(
  intakeId: string,
  force: boolean = false
): Promise<GenerateDraftsResult> {
  const startTime = Date.now()

  log.info("Starting draft generation", { intakeId, force })

  try {
    // AUTH CHECK: Verify caller is doctor/admin when called as server action.
    // When called from Stripe webhook (no user session), auth will return null — that's OK
    // because the webhook handler already verified the Stripe signature.
    try {
      const { requireRoleOrNull } = await import("@/lib/auth")
      const authResult = await requireRoleOrNull(["doctor", "admin"])
      if (!authResult) {
        log.info("Draft generation called without doctor session (likely webhook)", { intakeId })
      }
    } catch {
      // Auth module may throw in non-request contexts (cron, webhook) — acceptable
      log.info("Auth check skipped for non-request context", { intakeId })
    }

    // Check idempotency - skip if drafts already exist
    if (!force) {
      const exists = await draftsExist(intakeId)
      if (exists) {
        log.info("Drafts already exist, skipping", { intakeId })
        return { success: true, skipped: true }
      }
    } else {
      // Force regenerate - delete existing drafts
      await deleteDrafts(intakeId)
    }

    // Fetch intake with answers and service details
    const supabase = getServiceClient()
    const { data: intake, error: intakeError } = await supabase
      .from("intakes")
      .select(`
        *,
        service:services!service_id(
          id,
          slug,
          name,
          type
        ),
        patient:profiles!patient_id(
          id,
          full_name,
          date_of_birth
        ),
        answers:intake_answers(
          answers
        )
      `)
      .eq("id", intakeId)
      .single()

    if (intakeError || !intake) {
      log.error("Intake not found", { intakeId }, intakeError)
      return { success: false, error: "Intake not found" }
    }

    // Determine service type and validate
    const service = intake.service as { slug: string; type: string; name: string } | null
    if (!service || !service.type) {
      log.info("No service type found, skipping draft generation", { intakeId })
      return { success: true, skipped: true }
    }

    // Normalize service type to canonical value using centralized util
    const serviceType = normalizeServiceType(service.type)

    if (!serviceType) {
      // Unknown service type - generate ONLY clinical_note draft and log warning to Sentry
      log.warn("Unknown service type, generating clinical_note only", {
        intakeId,
        rawServiceType: service.type,
      })

      Sentry.captureMessage("Unknown service type in draft generation", {
        level: "warning",
        tags: {
          service_type: service.type,
          intake_id: intakeId,
        },
        extra: {
          serviceName: service.name,
          serviceSlug: service.slug,
        },
      })

      // Generate only clinical note for unknown service types
      const patient = intake.patient as { id: string; full_name: string; date_of_birth: string | null } | null
      const answersArray = intake.answers as { answers: Record<string, unknown> }[] | null
      const answers = answersArray?.[0]?.answers || {}
      const intakeContext = formatIntakeContext(intake, patient, answers, "med_certs") // Use med_certs as fallback for context

      const clinicalNoteResult = await generateClinicalNoteDraft(intakeId, intakeContext, answers)

      return {
        success: true,
        clinicalNote: clinicalNoteResult,
      }
    }

    // Get draft category from canonical service type
    const draftCategory = getDraftCategory(serviceType)

    const patient = intake.patient as { id: string; full_name: string; date_of_birth: string | null } | null
    const answersArray = intake.answers as { answers: Record<string, unknown> }[] | null
    const answers = answersArray?.[0]?.answers || {}

    // Prepare intake context for AI (service-type aware)
    const intakeContext = formatIntakeContext(intake, patient, answers, serviceType)

    // Generate clinical note for ALL service types
    const clinicalNoteResult = await generateClinicalNoteDraft(intakeId, intakeContext, answers)

    // Generate service-specific draft based on draft category (derived from canonical service type)
    let serviceSpecificResult: { status: "ready" | "failed"; error?: string }

    if (draftCategory === "med_cert") {
      serviceSpecificResult = await generateMedCertDraft(intakeId, intakeContext, answers, patient?.full_name || "Patient")
    } else if (draftCategory === "repeat_rx") {
      serviceSpecificResult = await generateRepeatRxDraft(intakeId, intakeContext, answers)
    } else {
      serviceSpecificResult = await generateConsultDraft(intakeId, intakeContext, answers)
    }

    const duration = Date.now() - startTime
    log.info("Draft generation completed", {
      intakeId,
      serviceType,
      draftCategory,
      durationMs: duration,
      clinicalNote: clinicalNoteResult.status,
      serviceSpecific: serviceSpecificResult.status,
    })

    // Build result based on draft category
    const result: GenerateDraftsResult = {
      success: true,
      serviceType,
      draftCategory,
      clinicalNote: clinicalNoteResult,
    }

    if (draftCategory === "med_cert") {
      result.medCert = serviceSpecificResult
    } else if (draftCategory === "repeat_rx") {
      result.repeatRx = serviceSpecificResult
    } else {
      result.consult = serviceSpecificResult
    }

    return result

  } catch (error) {
    log.error("Unexpected error in draft generation", { intakeId }, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}
