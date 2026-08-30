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
    "We're unable to take your message right now. " +
      "Please use instant med dot com dot au slash contact. Goodbye.",
  )
  response.hangup()
  return twimlResponse(response.toString())
}
