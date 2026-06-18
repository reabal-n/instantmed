import { signCheckoutResumeToken } from "@/lib/crypto/checkout-resume-token"
import { createLogger } from "@/lib/observability/logger"

export const CHECKOUT_RESUME_TOKEN_PARAM = "resume_token"

const logger = createLogger("checkout-recovery-link")

function trySignCheckoutResumeToken(intakeId: string): string | null {
  if (!process.env.INTERNAL_API_SECRET) {
    if (process.env.NODE_ENV === "production") {
      logger.warn("Unable to add checkout resume token; INTERNAL_API_SECRET is not configured")
    }
    return null
  }

  try {
    return signCheckoutResumeToken(intakeId)
  } catch (error) {
    logger.warn("Unable to add checkout resume token", {}, error)
    return null
  }
}

export function buildGuestCheckoutCancelUrl({
  baseUrl,
  intakeId,
}: {
  baseUrl: string
  intakeId: string
}): string {
  const url = new URL("/checkout/cancelled", baseUrl)
  url.searchParams.set("intake_id", intakeId)

  const resumeToken = trySignCheckoutResumeToken(intakeId)
  if (resumeToken) {
    url.searchParams.set(CHECKOUT_RESUME_TOKEN_PARAM, resumeToken)
  }

  return url.toString()
}
