import twilio from "twilio"

import { applyRateLimit } from "@/lib/rate-limit/redis"
import {
  claimVoiceCallSlot,
  fingerprintVoiceCaller,
  isVoiceCallerBlocked,
  releaseVoiceCallSlot,
} from "@/lib/twilio/voice-abuse"
import { getTwilioVoiceReadiness } from "@/lib/twilio/voice-config"
import { createTwilioVoiceSessionToken } from "@/lib/twilio/voice-session-token"
import {
  getTwilioVoiceUrl,
  getTwilioVoiceWebSocketUrl,
  twimlResponse,
  validateTwilioVoiceForm,
} from "@/lib/twilio/voice-webhook"

const PATHNAME = "/api/webhooks/twilio/voice/incoming"
const FALLBACK =
  "We're unable to take your message right now. Please use instant med dot com dot au slash contact. Goodbye."

function fallbackResponse(): Response {
  const response = new twilio.twiml.VoiceResponse()
  response.say(FALLBACK)
  response.hangup()
  return twimlResponse(response.toString())
}

export async function POST(request: Request): Promise<Response> {
  const validation = await validateTwilioVoiceForm(request, PATHNAME)
  if (!validation.ok) return validation.response
  if (!getTwilioVoiceReadiness().ready) return fallbackResponse()

  const callSid = validation.params.get("CallSid") ?? ""
  const caller = validation.params.get("From") ?? "anonymous"
  let callerFingerprint: string
  try {
    callerFingerprint = fingerprintVoiceCaller(caller)
  } catch {
    return fallbackResponse()
  }

  if (isVoiceCallerBlocked(callerFingerprint)) return fallbackResponse()
  const rateLimitResponse = await applyRateLimit(
    request,
    "voice",
    `voice-caller:${callerFingerprint}`,
  )
  if (rateLimitResponse) return fallbackResponse()

  let slotClaimed = false
  try {
    slotClaimed = await claimVoiceCallSlot(callSid)
  } catch {
    slotClaimed = false
  }
  if (!slotClaimed) return fallbackResponse()

  let sessionToken: string
  try {
    sessionToken = createTwilioVoiceSessionToken({ callSid })
  } catch {
    await releaseVoiceCallSlot(callSid).catch(() => undefined)
    return fallbackResponse()
  }

  const response = new twilio.twiml.VoiceResponse()
  const connect = response.connect()
  const stream = connect.stream({
    statusCallback: getTwilioVoiceUrl("/api/webhooks/twilio/voice/stream-status"),
    statusCallbackMethod: "POST",
    url: getTwilioVoiceWebSocketUrl("/api/webhooks/twilio/voice/stream"),
  })
  stream.parameter({ name: "sessionToken", value: sessionToken })

  response.say(FALLBACK)
  response.hangup()
  return twimlResponse(response.toString())
}
