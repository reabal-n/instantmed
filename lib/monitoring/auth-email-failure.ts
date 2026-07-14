import type { BusinessAlert } from "@/lib/monitoring/alert-sections"

type AuthEmailFailureAlert = BusinessAlert & {
  metric: "auth_email_delivery_failed"
  severity: "critical"
}

export function buildAuthEmailFailureAlert(failed: number): AuthEmailFailureAlert | null {
  if (failed <= 0) return null

  return {
    metric: "auth_email_delivery_failed",
    severity: "critical",
    count: failed,
    detail: `${failed} auth email delivery ${failed === 1 ? "failure" : "failures"} in the last hour; sign-in or password recovery may be blocked`,
  }
}
