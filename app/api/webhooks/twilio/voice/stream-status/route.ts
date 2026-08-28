import { createLogger } from "@/lib/observability/logger"
import { validateTwilioVoiceForm } from "@/lib/twilio/voice-webhook"

const PATHNAME = "/api/webhooks/twilio/voice/stream-status"
const logger = createLogger("twilio-voice-stream-status")

export async function POST(request: Request): Promise<Response> {
  const validation = await validateTwilioVoiceForm(request, PATHNAME)
  if (!validation.ok) return validation.response

  if (validation.params.get("StreamEvent") === "stream-error") {
    logger.error("Twilio voice media stream failed", {
      hasProviderDetail: Boolean(validation.params.get("StreamError")),
      streamEvent: "stream-error",
    })
  }

  return new Response(null, {
    status: 204,
    headers: { "cache-control": "no-store" },
  })
}
