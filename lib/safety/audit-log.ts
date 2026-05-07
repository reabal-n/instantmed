import "server-only"

import { createLogger } from "@/lib/observability/logger"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

import type { ServerSafetyCheck } from "./evaluate"

const logger = createLogger("safety-audit-log")

interface RecordSafetyEvaluationInput {
  answers: Record<string, unknown>
  context: "checkout" | "retry_payment"
  requestId?: string
  result: ServerSafetyCheck
  serviceSlug: string
}

const RISK_SCORE: Record<ServerSafetyCheck["riskTier"], number> = {
  low: 0,
  medium: 40,
  high: 70,
  critical: 100,
}

export async function recordSafetyEvaluationForOperators({
  answers,
  context,
  requestId,
  result,
  serviceSlug,
}: RecordSafetyEvaluationInput): Promise<void> {
  try {
    const supabase = createServiceRoleClient()
    const { error } = await supabase.from("safety_audit_log").insert({
      answers_snapshot: {},
      evaluation_type: "checkout_safety",
      flags: result.triggeredRuleIds,
      input_data: {
        answer_keys: Object.keys(answers),
        context,
      },
      output_data: {
        is_allowed: result.isAllowed,
        requires_call: result.requiresCall,
      },
      reason: result.blockReason || null,
      request_id: requestId || null,
      requires_review: result.outcome !== "ALLOW",
      result: result.outcome,
      risk_score: RISK_SCORE[result.riskTier],
      risk_tier: result.riskTier,
      service_slug: serviceSlug,
      session_id: requestId ? `intake:${requestId}` : `checkout:${serviceSlug}`,
      outcome: result.outcome,
      triggered_rule_ids: result.triggeredRuleIds,
    })

    if (error) {
      logger.error("Failed to persist safety audit log", {
        outcome: result.outcome,
        serviceSlug,
      }, new Error(error.message))
    }
  } catch (error) {
    logger.error(
      "Failed to persist safety audit log",
      { outcome: result.outcome, serviceSlug },
      error instanceof Error ? error : undefined,
    )
  }
}
