import "server-only"
import { createLogger } from "@/lib/observability/logger"
import { toError } from "@/lib/errors"

const logger = createLogger("data-intakes-email")

/**
 * Trigger status notification email via internal API
 * Non-blocking - failures are logged but don't affect the main operation
 */
export async function triggerStatusEmail(
  intakeId: string,
  status: string,
  reviewedBy?: string
): Promise<void> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://instantmed.com.au"
  const internalSecret = process.env.INTERNAL_API_SECRET

  if (!internalSecret) {
    logger.warn("[triggerStatusEmail] INTERNAL_API_SECRET not configured, skipping email")
    return
  }

  // Map status to API status parameter
  const statusMap: Record<string, string> = {
    approved: "approved",
    declined: "declined",
    pending_info: "needs_follow_up",
  }

  const apiStatus = statusMap[status]
  if (!apiStatus) return

  try {
    const response = await fetch(`${appUrl}/api/internal/send-status-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-secret": internalSecret,
      },
      body: JSON.stringify({
        requestId: intakeId,
        status: apiStatus,
        doctorName: reviewedBy ? undefined : undefined, // Could fetch doctor name if needed
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      logger.warn("[triggerStatusEmail] API returned error", { status: response.status, error: errorText })
    }
  } catch (error) {
    logger.error("[triggerStatusEmail] Failed to call email API", {}, toError(error))
  }
}
