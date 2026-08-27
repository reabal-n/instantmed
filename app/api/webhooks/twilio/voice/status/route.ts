import { releaseVoiceCallSlot } from "@/lib/twilio/voice-abuse"
import { validateTwilioVoiceForm } from "@/lib/twilio/voice-webhook"

const PATHNAME = "/api/webhooks/twilio/voice/status"

export async function POST(request: Request): Promise<Response> {
  const validation = await validateTwilioVoiceForm(request, PATHNAME)
  if (!validation.ok) return validation.response
  const callSid = validation.params.get("CallSid")
  const callStatus = validation.params.get("CallStatus")
  if (callSid && ["completed", "busy", "failed", "no-answer", "canceled"].includes(callStatus ?? "")) {
    await releaseVoiceCallSlot(callSid).catch(() => undefined)
  }
  return new Response(null, {
    status: 204,
    headers: { "cache-control": "no-store" },
  })
}
