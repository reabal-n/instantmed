import twilio from "twilio"

import { LENA_EMERGENCY_DIRECTION, LENA_SAVE_FAILURE, LENA_SAVE_SUCCESS } from "@/lib/twilio/openai-realtime"
import { LENA_ELEVENLABS_VOICE_ID } from "@/lib/twilio/voice-config"
import {
  twimlResponse,
  validateTwilioVoiceForm,
} from "@/lib/twilio/voice-webhook"

const PATHNAME = "/api/webhooks/twilio/voice/fallback"

export async function POST(request: Request): Promise<Response> {
  const validation = await validateTwilioVoiceForm(request, PATHNAME)
  if (!validation.ok) return validation.response

  const response = new twilio.twiml.VoiceResponse()
  if (validation.params.get("SessionStatus") === "ended") {
    try {
      const handoff = JSON.parse(validation.params.get("HandoffData") ?? "{}")
      const sentence = handoff.outcome === "saved" ? LENA_SAVE_SUCCESS
        : handoff.outcome === "emergency" ? LENA_EMERGENCY_DIRECTION
        : handoff.outcome === "unconfirmed" ? LENA_SAVE_FAILURE : null
      if (sentence) {
        // Native TwiML sequencing waits for this sentence before Hangup. Error
        // closeouts use the default voice so they do not depend on ElevenLabs.
        if (handoff.outcome === "unconfirmed") response.say(sentence)
        // ElevenLabs Say voices postdate the installed SDK's voice union.
        else response.addChild("Say", { voice: `ElevenLabs.${LENA_ELEVENLABS_VOICE_ID}`, language: "en-US" }).addText(sentence)
        response.hangup()
        return twimlResponse(response.toString())
      }
    } catch { /* Invalid handoff gets the normal contact fallback. */ }
  }
  response.say(
    "We're unable to take your message right now. " +
      "Please use instant med dot com dot au slash contact. Goodbye.",
  )
  response.hangup()
  return twimlResponse(response.toString())
}
