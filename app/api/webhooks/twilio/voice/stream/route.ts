import { experimental_upgradeWebSocket } from "@vercel/functions"
import type WebSocket from "ws"

import {
  attachTwilioOpenAIRealtimeBridge,
  type VoiceSocket,
} from "@/lib/twilio/openai-realtime-bridge"
import { getTwilioVoiceReadiness } from "@/lib/twilio/voice-config"
import { validateTwilioVoiceWebSocketSignature } from "@/lib/twilio/voice-webhook"

const PATHNAME = "/api/webhooks/twilio/voice/stream"

export const dynamic = "force-dynamic"
export const maxDuration = 800
export const runtime = "nodejs"

function isVoiceAgentConfigured(): boolean {
  return getTwilioVoiceReadiness().ready
}

export async function GET(request: Request): Promise<Response> {
  const validation = validateTwilioVoiceWebSocketSignature(request, PATHNAME)
  if (!validation.ok) return validation.response
  if (!isVoiceAgentConfigured()) {
    return Response.json({ error: "Voice agent is not enabled" }, { status: 503 })
  }

  return experimental_upgradeWebSocket((socket: WebSocket) => {
    // Twilio can send its start frame immediately. Attach every listener before
    // returning from the upgrade callback so no start/session frame is lost.
    attachTwilioOpenAIRealtimeBridge(socket as unknown as VoiceSocket)
  }, { maxPayload: 64 * 1024 })
}
