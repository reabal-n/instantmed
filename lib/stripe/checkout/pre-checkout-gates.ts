/**
 * Pre-checkout gates: env kill switch, DB service-disabled flags, capacity.
 *
 * Each gate is fail-closed: if the underlying check throws, the caller
 * (orchestrator) translates the failure into a user-facing error. None of
 * these gates side-effect besides analytics for the capacity block.
 */

import { trackOperationalBlock } from "@/lib/analytics/posthog-server"
import { checkCheckoutBlocked } from "@/lib/config/kill-switches"
import { isServiceDisabled, SERVICE_DISABLED_ERRORS } from "@/lib/feature-flags"
import { isAtCapacity } from "@/lib/operational-controls/config"

import type { CreateCheckoutInput, StepResult } from "./types"
import { stepFail, stepOk } from "./types"

const CATEGORY_TO_SERVICE: Record<string, "medical_certificate" | "prescription" | "other"> = {
  medical_certificate: "medical_certificate",
  prescription: "prescription",
  consult: "other",
}

export async function runPreCheckoutGates(input: CreateCheckoutInput): Promise<StepResult> {
  // Env-var kill switch (no DB round-trip).
  const envKillSwitch = checkCheckoutBlocked(input.category, input.subtype)
  if (envKillSwitch.blocked) {
    return stepFail(envKillSwitch.userMessage)
  }

  // DB-backed service-disabled kill switch.
  const serviceCategory = CATEGORY_TO_SERVICE[input.category] || "other"
  if (await isServiceDisabled(serviceCategory)) {
    const errorCode =
      serviceCategory === "medical_certificate"
        ? SERVICE_DISABLED_ERRORS.MED_CERT_DISABLED
        : serviceCategory === "prescription"
          ? SERVICE_DISABLED_ERRORS.REPEAT_SCRIPTS_DISABLED
          : SERVICE_DISABLED_ERRORS.CONSULTS_DISABLED
    return stepFail(
      `This service is temporarily unavailable. Please try again later. [${errorCode}]`,
    )
  }

  // Capacity guard. Fails closed when the underlying RPC throws (per CLAUDE.md
  // operational-controls invariant) so this returns true on count-RPC failure.
  if (await isAtCapacity()) {
    trackOperationalBlock({ blockType: "capacity_limit", source: "checkout", userId: input.patientId })
    return stepFail("We're experiencing high demand today. Please try again tomorrow.")
  }

  return stepOk(undefined)
}
