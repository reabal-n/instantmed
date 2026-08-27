import twilio from "twilio"

import {
  getTwilioVoiceUrl,
  twimlResponse,
  validateTwilioVoiceForm,
} from "@/lib/twilio/voice-webhook"

const PATHNAME = "/api/webhooks/twilio/voice/incoming"

export async function POST(request: Request): Promise<Response> {
  const validation = await validateTwilioVoiceForm(request, PATHNAME)
  if (!validation.ok) return validation.response

  const response = new twilio.twiml.VoiceResponse()
  const gather = response.gather({
    action: getTwilioVoiceUrl("/api/webhooks/twilio/voice/consent"),
    actionOnEmptyResult: true,
    input: ["dtmf"],
    method: "POST",
    numDigits: 1,
    timeout: 8,
  })

  gather.say(
    "Thanks for calling InstantMed. You are speaking with an automated support assistant. " +
      "If this is a medical emergency, hang up and call triple zero. " +
      "This call will be transcribed and processed by artificial intelligence to help record your request. " +
      "It cannot give medical advice or make clinical decisions. " +
      "Press 1 if you consent and want to continue. Press 2 to end the call.",
  )

  response.say(
    "We have not connected the automated assistant. " +
      "Please contact support by email at support at instantmed dot com dot au. Goodbye.",
  )
  response.hangup()

  return twimlResponse(response.toString())
}
