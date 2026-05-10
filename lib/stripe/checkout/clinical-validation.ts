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
import { isControlledSubstance } from "@/lib/clinical/intake-validation"
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
}

export async function runClinicalValidation(
  input: CreateCheckoutInput,
): Promise<StepResult<ClinicalValidationResult>> {
  if (input.category === "medical_certificate") {
    const validation = validateMedCertPayload(input.answers)
    if (!validation.valid) {
      return stepFail(validation.error || "Invalid medical certificate request.")
    }
  }

  if (input.category === "prescription" && input.subtype === "repeat") {
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
    const medCheck = await isMedicationBlocked(getMedicationBlocklistCandidate(input.answers))
    if (medCheck.blocked) {
      return stepFail(
        `This medication cannot be prescribed through our online service for compliance reasons. Please consult your regular doctor. [${SERVICE_DISABLED_ERRORS.MEDICATION_BLOCKED}]`,
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
    return stepFail(
      `Required medical information is missing. Please go back and complete all questions. Missing: ${fieldCheck.missingFields.join(", ")}`,
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

  return stepOk({ serviceSlugForSafety, safetyCheck })
}
