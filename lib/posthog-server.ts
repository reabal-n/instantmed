import { PostHog } from 'posthog-node';

let posthogClient: PostHog | null = null;

export function getPostHogClient() {
  if (!posthogClient) {
    posthogClient = new PostHog(
      process.env.NEXT_PUBLIC_POSTHOG_KEY!,
      {
        host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
        flushAt: 1,
        flushInterval: 0
      }
    );
  }
  return posthogClient;
}

export async function shutdownPostHog() {
  if (posthogClient) {
    await posthogClient.shutdown();
  }
}

// ============================================
// SAFETY OUTCOME ANALYTICS
// ============================================

export interface SafetyOutcomeEvent {
  serviceSlug: string
  outcome: 'ALLOW' | 'REQUEST_MORE_INFO' | 'REQUIRES_CALL' | 'DECLINE'
  riskTier: 'low' | 'medium' | 'high' | 'critical'
  triggeredRuleIds: string[]
  triggeredRuleCount: number
  evaluationDurationMs: number
  sessionId?: string
  userId?: string
}

/**
 * Track safety evaluation outcome for analytics
 * Call this after evaluateSafety() to record the result
 */
export function trackSafetyOutcome(event: SafetyOutcomeEvent) {
  try {
    const client = getPostHogClient()
    const distinctId = event.userId || event.sessionId || 'anonymous'
    
    client.capture({
      distinctId,
      event: 'safety_evaluation_completed',
      properties: {
        service_slug: event.serviceSlug,
        outcome: event.outcome,
        risk_tier: event.riskTier,
        triggered_rule_ids: event.triggeredRuleIds,
        triggered_rule_count: event.triggeredRuleCount,
        evaluation_duration_ms: event.evaluationDurationMs,
        is_blocked: event.outcome !== 'ALLOW',
        requires_call: event.outcome === 'REQUIRES_CALL',
        is_declined: event.outcome === 'DECLINE',
      },
    })
  } catch {
    // Non-blocking - don't fail the flow if analytics fails
  }
}

/**
 * Track when a user is blocked by safety rules
 */
export function trackSafetyBlock(event: {
  serviceSlug: string
  outcome: string
  blockReason: string
  triggeredRuleIds: string[]
  sessionId?: string
  userId?: string
}) {
  try {
    const client = getPostHogClient()
    const distinctId = event.userId || event.sessionId || 'anonymous'

    client.capture({
      distinctId,
      event: 'safety_block',
      properties: {
        service_slug: event.serviceSlug,
        outcome: event.outcome,
        block_reason: event.blockReason,
        triggered_rule_ids: event.triggeredRuleIds,
        triggered_rule_count: event.triggeredRuleIds.length,
      },
    })
  } catch {
    // Non-blocking
  }
}

// ============================================
// INTAKE FUNNEL ANALYTICS
// ============================================

/**
 * Track intake funnel step for drop-off analysis.
 * Call at each step: start → questionnaire → payment → review → approved/declined → delivered
 */
export function trackIntakeFunnelStep(event: {
  step: 'intake_started' | 'questionnaire_completed' | 'payment_initiated' | 'payment_completed' | 'review_started' | 'approved' | 'declined' | 'document_delivered'
  intakeId: string
  serviceSlug: string
  serviceType: string
  userId?: string
  sessionId?: string
  metadata?: Record<string, unknown>
}) {
  try {
    const client = getPostHogClient()
    const distinctId = event.userId || event.sessionId || 'anonymous'

    client.capture({
      distinctId,
      event: `intake_funnel_${event.step}`,
      properties: {
        intake_id: event.intakeId,
        service_slug: event.serviceSlug,
        service_type: event.serviceType,
        funnel_step: event.step,
        ...event.metadata,
      },
    })
  } catch {
    // Non-blocking
  }
}

/**
 * Track business metric events for alerting and dashboards
 */
export function trackBusinessMetric(event: {
  metric: 'payment_failed' | 'queue_backup' | 'sla_breach' | 'certificate_error' | 'email_delivery_failed' | 'high_risk_intake'
  severity: 'info' | 'warning' | 'critical'
  userId?: string
  metadata?: Record<string, unknown>
}) {
  try {
    const client = getPostHogClient()
    const distinctId = event.userId || 'system'

    client.capture({
      distinctId,
      event: `business_alert_${event.metric}`,
      properties: {
        metric: event.metric,
        severity: event.severity,
        ...event.metadata,
      },
    })
  } catch {
    // Non-blocking
  }
}
