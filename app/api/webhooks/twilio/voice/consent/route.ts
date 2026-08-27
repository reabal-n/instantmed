import twilio from "twilio"

import { getTwilioVoiceReadiness } from "@/lib/twilio/voice-config"
import { createTwilioVoiceSessionToken } from "@/lib/twilio/voice-session-token"
import {
  getTwilioVoicePublicBaseUrl,
  getTwilioVoiceUrl,
  twimlResponse,
  validateTwilioVoiceForm,
} from "@/lib/twilio/voice-webhook"

const PATHNAME = "/api/webhooks/twilio/voice/consent"
const SUPPORT_FALLBACK =
  "We have not connected the automated assistant. Please contact support by email at support at instantmed dot com dot au. Goodbye."

function isVoiceAgentConfigured(): boolean {
  return getTwilioVoiceReadiness().ready
}

function getStreamUrl(): string {
  const url = new URL(getTwilioVoicePublicBaseUrl())
  url.protocol = url.protocol === "http:" ? "ws:" : "wss:"
  url.pathname = "/api/webhooks/twilio/voice/stream"
  url.search = ""
  url.hash = ""
  return url.toString()
}

export async function POST(request: Request): Promise<Response> {
  const validation = await validateTwilioVoiceForm(request, PATHNAME)
  if (!validation.ok) return validation.response

  const response = new twilio.twiml.VoiceResponse()
  if (validation.params.get("Digits") !== "1") {
    response.say(SUPPORT_FALLBACK)
    response.hangup()
    return twimlResponse(response.toString())
  }

  if (!isVoiceAgentConfigured()) {
    response.say(
      "The automated assistant is temporarily unavailable. " +
        "Please contact support by email at support at instantmed dot com dot au. Goodbye.",
    )
    response.hangup()
    return twimlResponse(response.toString())
  }

  const callSid = validation.params.get("CallSid") ?? ""
  const caller = validation.params.get("From") ?? "anonymous"
  let sessionToken: string
  try {
    sessionToken = createTwilioVoiceSessionToken({ callSid, caller })
  } catch {
    response.say("The automated assistant is temporarily unavailable. Please try again later. Goodbye.")
    response.hangup()
    return twimlResponse(response.toString())
  }

  const connect = response.connect()
  const stream = connect.stream({
    statusCallback: getTwilioVoiceUrl("/api/webhooks/twilio/voice/stream-status"),
    statusCallbackMethod: "POST",
    url: getStreamUrl(),
  })
  stream.parameter({ name: "sessionToken", value: sessionToken })

  response.say(
    "The automated assistant disconnected before finishing. " +
      "Please contact support by email at support at instantmed dot com dot au. Goodbye.",
  )
  response.hangup()

  return twimlResponse(response.toString())
}
