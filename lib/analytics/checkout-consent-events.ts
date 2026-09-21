import { normalizeFlowInstanceId } from "@/lib/analytics/flow-instance"
import type { PostHogCaptureLike } from "@/lib/analytics/intake-events"

/** One tracker per review visit. Never accepts answers, identity, or DOM text. */
export function createCheckoutConsentTracker(
  posthog: PostHogCaptureLike | null,
  flowInstanceId: string | null | undefined,
  serviceType: string,
) {
  const flow = normalizeFlowInstanceId(flowInstanceId)
  const service = serviceType === "repeat-script" ? "prescription" : serviceType
  let seen = false
  let previous: boolean | undefined
  function capture(event: string, properties: Record<string, boolean | string> = {}) {
    if (!flow || !["med-cert", "prescription", "consult"].includes(service)) return
    try {
      posthog?.capture(event, {
        flow_instance_id: flow,
        service_type: service,
        telemetry_version: "checkout-consent-v1",
        ...properties,
      })
    } catch {
      // Optional measurement must never prevent consent or payment.
    }
  }
  return {
    viewed() {
      if (seen) return
      seen = true
      capture("checkout_consent_viewed")
    },
    reviewClicked() {
      capture("checkout_review_confirm_clicked")
    },
    state(checked: boolean) {
      if (previous === checked) return
      capture("checkout_consent_state", {
        consent_checked: checked,
        state_source: previous === undefined ? "initial" : "change",
      })
      previous = checked
    },
  }
}
