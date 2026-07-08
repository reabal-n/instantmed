/**
 * Clinical validation pipeline:
 *   1. Service-specific Zod payload validation (med-cert / repeat-script).
 *   2. Medication blocklist check (DB-backed feature flag).
 *   3. Schedule 8 / controlled-substance regex hard-block.
 *   4. Safety field completeness check.
 *   5. Safety rules evaluation.
 *
 * The safety result is returned to the caller so the persistence step can
 * write it to the intake's triage fields and emit the audit log entry once
 * the intake row exists.
 */

import { trackSafetyBlock,trackSafetyOutcome } from "@/lib/analytics/posthog-server"
import { deriveIntakeFlags } from "@/lib/clinical/derive-intake-flags"
import type { IntakeFlag } from "@/lib/clinical/intake-flags"
import { checkHighStakesUseCase, isControlledSubstance } from "@/lib/clinical/intake-validation"
import { isMedicationBlocked, SERVICE_DISABLED_ERRORS } from "@/lib/feature-flags"
import { createLogger } from "@/lib/observability/logger"
import { getMedicationBlocklistCandidate } from "@/lib/operational-controls/medication-blocklist"
import { recordSafetyEvaluationForOperators } from "@/lib/safety/audit-log"
import { checkSafetyForServer, type ServerSafetyCheck,validateSafetyFieldsPresent } from "@/lib/safety/evaluate"
import { validateMedCertPayload } from "@/lib/validation/med-cert-schema"
import { validateRepeatScriptPayload } from "@/lib/validation/repeat-script-schema"

import { getServiceSlug } from "./helpers"
import type { CreateCheckoutInput, StepResult } from "./types"
import { stepFail, stepOk } from "./types"

const logger = createLogger("stripe-checkout-clinical")

export interface ClinicalValidationResult {
  serviceSlugForSafety: string
  safetyCheck: ServerSafetyCheck
  /**
   * Doctor-visible flags derived from softened intake gaps (e.g. missing
   * medication strength). Persisted to `intakes.risk_flags`; never blocks
   * checkout. The keep-list stays as hard fails above this point.
   */
  intakeFlags: IntakeFlag[]
}

function isRepeatPrescriptionSubtype(category: string, subtype: string): boolean {
  return category === "prescription" && (subtype === "repeat" || subtype === "chronic_review")
}

export async function runClinicalValidation(
  input: CreateCheckoutInput,
): Promise<StepResult<ClinicalValidationResult>> {
  if (input.category === "medical_certificate") {
    const validation = validateMedCertPayload(input.answers)
    if (!validation.valid) {
      return stepFail(validation.error || "Invalid medical certificate request.")
    }

    // Server-side high-stakes block (exam deferral, court, fitness-to-X,
    // workers comp, Centrelink...). The client gate in symptoms-step is
    // advisory only and the auto-approval net fires AFTER payment; this is
    // the authoritative pre-payment enforcement so a structurally
    // un-issuable cert never takes money (pay-then-decline refund churn).
    // Same alias set as validateMedCertPayload reads, plus additional-info fields.
    const highStakesText = [
      input.answers["symptoms_description"],
      input.answers["symptom_details"],
      input.answers["symptomDetails"],
      input.answers["symptomsDescription"],
      input.answers["additional_info"],
      input.answers["additionalInfo"],
      input.answers["additional_information"],
    ]
      .filter((value): value is string => typeof value === "string" && value.length > 0)
      .join("\n")
    const highStakes = checkHighStakesUseCase(highStakesText)
    if (highStakes.isHighStakes) {
      logger.warn("High-stakes use case blocked at checkout", {
        matched: highStakes.matched,
      })
      await recordSafetyEvaluationForOperators({
        answers: input.answers,
        context: "checkout",
        result: {
          isAllowed: false,
          outcome: "DECLINE",
          riskTier: "high",
          blockReason: highStakes.reason || "High-stakes certificate use case.",
          requiresCall: false,
          triggeredRuleIds: ["high_stakes_use_case"],
        },
        serviceSlug: input.serviceSlug || getServiceSlug(input.category, input.subtype),
      })
      return stepFail(
        `${highStakes.reason || "This type of certificate cannot be issued through an online assessment."} You have not been charged. Please see a GP in person, who can carry out the assessment this document requires.`,
      )
    }
  }

  if (isRepeatPrescriptionSubtype(input.category, input.subtype)) {
    const validation = validateRepeatScriptPayload(input.answers)
    if (!validation.valid) {
      return stepFail(validation.error || "Invalid repeat script request.")
    }

    const medicationBlocklistCandidate = getMedicationBlocklistCandidate(input.answers)
    const medCheck = await isMedicationBlocked(medicationBlocklistCandidate)
    if (medCheck.blocked) {
      return stepFail(
        `This medication cannot be prescribed through our online service for compliance reasons. Please consult your regular doctor. [${SERVICE_DISABLED_ERRORS.MEDICATION_BLOCKED}]`,
      )
    }

    if (medicationBlocklistCandidate && isControlledSubstance(medicationBlocklistCandidate)) {
      logger.warn("Controlled substance blocked at checkout", { category: input.category })
      return stepFail(
        "This medication cannot be prescribed through our online service. Controlled substances require an in-person consultation with your regular GP.",
      )
    }
  }

  if (input.category === "consult") {
    const medicationBlocklistCandidate = getMedicationBlocklistCandidate(input.answers)
    const medCheck = await isMedicationBlocked(medicationBlocklistCandidate)
    if (medCheck.blocked) {
      return stepFail(
        `This medication cannot be prescribed through our online service for compliance reasons. Please consult your regular doctor. [${SERVICE_DISABLED_ERRORS.MEDICATION_BLOCKED}]`,
      )
    }

    // Hard-block Schedule 8 / controlled substances named in free-text consult
    // details (the candidate already reads consult_details). The repeat-script
    // branch above does the same; consult must not be a back-channel around it.
    if (medicationBlocklistCandidate && isControlledSubstance(medicationBlocklistCandidate)) {
      logger.warn("Controlled substance blocked at checkout", { category: input.category })
      return stepFail(
        "This medication cannot be prescribed through our online service. Controlled substances require an in-person consultation with your regular GP.",
      )
    }
  }

  const serviceSlugForSafety = input.serviceSlug || getServiceSlug(input.category, input.subtype)

  const fieldCheck = validateSafetyFieldsPresent(serviceSlugForSafety, input.answers)
  if (!fieldCheck.valid) {
    logger.warn("Safety fields missing at checkout", {
      serviceSlug: serviceSlugForSafety,
      missingFields: fieldCheck.missingFields,
    })
    await recordSafetyEvaluationForOperators({
      answers: input.answers,
      context: "checkout",
      result: {
        isAllowed: false,
        outcome: "REQUEST_MORE_INFO",
        riskTier: "high",
        blockReason: "Required medical information is missing.",
        requiresCall: false,
        triggeredRuleIds: ["missing_safety_fields"],
      },
      serviceSlug: serviceSlugForSafety,
    })
    // Do NOT surface raw internal field keys (e.g. "startDate", "duration") to
    // the patient — they read as broken. The specific missing fields are already
    // captured in the operator record + logs above; the patient just needs to go
    // back and complete the highlighted required questions.
    return stepFail(
      "Some required medical information is missing. Please go back and complete all the required questions before continuing.",
    )
  }

  const safetyCheck = checkSafetyForServer(serviceSlugForSafety, input.answers)

  trackSafetyOutcome({
    serviceSlug: serviceSlugForSafety,
    outcome: safetyCheck.outcome,
    riskTier: safetyCheck.riskTier,
    triggeredRuleIds: safetyCheck.triggeredRuleIds,
    triggeredRuleCount: safetyCheck.triggeredRuleIds.length,
    evaluationDurationMs: 0,
  })

  if (!safetyCheck.isAllowed) {
    logger.warn("Safety check blocked checkout", {
      serviceSlug: serviceSlugForSafety,
      outcome: safetyCheck.outcome,
      riskTier: safetyCheck.riskTier,
      triggeredRules: safetyCheck.triggeredRuleIds,
    })

    trackSafetyBlock({
      serviceSlug: serviceSlugForSafety,
      outcome: safetyCheck.outcome,
      blockReason: safetyCheck.blockReason || "Unknown reason",
      triggeredRuleIds: safetyCheck.triggeredRuleIds,
    })
    await recordSafetyEvaluationForOperators({
      answers: input.answers,
      context: "checkout",
      result: safetyCheck,
      serviceSlug: serviceSlugForSafety,
    })

    if (safetyCheck.outcome === "DECLINE") {
      return stepFail(
        safetyCheck.blockReason ||
          "This request cannot be processed online. Please see your regular doctor.",
      )
    }

    if (safetyCheck.outcome === "REQUIRES_CALL") {
      return stepFail(
        safetyCheck.blockReason ||
          "This request requires a phone consultation. Please contact us to proceed.",
      )
    }

    // REQUEST_MORE_INFO — should not reach checkout, but handle gracefully.
    return stepFail(
      safetyCheck.blockReason ||
        "Additional information is required. Please go back and complete all questions.",
    )
  }

  const intakeFlags = deriveIntakeFlags({
    category: input.category,
    subtype: input.subtype,
    answers: input.answers,
  })

  return stepOk({ serviceSlugForSafety, safetyCheck, intakeFlags })
}
