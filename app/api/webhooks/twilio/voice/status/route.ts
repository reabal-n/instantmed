import { validateTwilioVoiceForm } from "@/lib/twilio/voice-webhook"

const PATHNAME = "/api/webhooks/twilio/voice/status"

export async function POST(request: Request): Promise<Response> {
  const validation = await validateTwilioVoiceForm(request, PATHNAME)
  if (!validation.ok) return validation.response
  return new Response(null, {
    status: 204,
    headers: { "cache-control": "no-store" },
  })
}
