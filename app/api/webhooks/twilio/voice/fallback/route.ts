import twilio from "twilio"

import {
  twimlResponse,
  validateTwilioVoiceForm,
} from "@/lib/twilio/voice-webhook"

const PATHNAME = "/api/webhooks/twilio/voice/fallback"

export async function POST(request: Request): Promise<Response> {
  const validation = await validateTwilioVoiceForm(request, PATHNAME)
  if (!validation.ok) return validation.response

  const response = new twilio.twiml.VoiceResponse()
  response.say(
    "The automated support assistant is temporarily unavailable. " +
      "Please contact support by email at support at instantmed dot com dot au. Goodbye.",
  )
  response.hangup()
  return twimlResponse(response.toString())
}
