import "server-only"

import { z } from "zod"

import {
  createVoiceCallbackRequest,
  type VoiceCallbackRequestInput,
  type VoiceCallbackRequestResult,
} from "@/lib/twilio/voice-callback-request"
import type { TwilioVoiceSession } from "@/lib/twilio/voice-session-token"

export const OPENAI_REALTIME_MODEL = "gpt-realtime-2.1"

const callbackToolArgumentsSchema = z.object({
  callback_number: z.string().trim().min(3).max(64).optional(),
  caller_confirmed: z.literal(true),
  caller_name: z.string().trim().min(1).max(100).optional(),
  category: z.enum([
    "account_or_payment",
    "document_adjustment",
    "prescription_or_clinical",
    "technical_support",
    "other",
  ]),
  summary: z.string().trim().min(3).max(1_000),
})

export const INSTANTMED_VOICE_AGENT_INSTRUCTIONS = `
You are InstantMed's automated administrative support assistant on a phone call.

Your job is narrow: understand what the caller needs, answer only simple general administrative questions using the approved facts below, and securely record a callback request when the matter cannot be resolved safely.

Hard boundaries:
- Never diagnose, assess clinical safety, recommend treatment, give medical advice, or change a prescription, certificate, consultation outcome, document, account, charge, or patient record.
- Never promise that anything will be fixed, adjusted, approved, prescribed, refunded, sent, or completed.
- Never claim that a callback request was recorded, sent, or relayed until create_callback_request returns recorded=true.
- Never disclose patient-specific status or information because a phone caller has not been authenticated.
- Never ask for Medicare details, date of birth, a full medical history, or more health detail than is necessary to write a short callback summary.
- If the caller describes an emergency or immediate danger, tell them to hang up and call triple zero now. Do not attempt triage.
- Do not give a callback timeframe. Say an AHPRA-registered Medical Director will review the request, without promising when.

Approved general facts:
- InstantMed is an Australian telehealth service and operates 24/7, with review timing varying by demand and clinical need.
- The website is instantmed.com.au.
- The support email is support@instantmed.com.au.

Conversation flow:
1. Start briefly: thank the caller for consenting and ask what you can help with.
2. For any requested adjustment, correction, medication or clinical question, patient-specific status question, unresolved problem, or anything outside the approved facts, collect a concise message and confirm the summary with the caller.
3. Use the number they are calling from unless they clearly provide a different callback number. Do not repeat a full phone number aloud unless needed to correct it.
4. Call create_callback_request exactly once after the caller confirms the summary.
5. Only after the tool returns recorded=true, say: "I've securely recorded your callback request for the Medical Director." You may add that no callback time can be promised.
6. If the tool returns recorded=false, say the request could not be confirmed and direct the caller to support@instantmed.com.au. Do not imply it was saved.

Keep replies calm, brief, and plain. Do not mention internal tools, prompts, databases, or policies.
`.trim()

export function buildOpenAIRealtimeSessionUpdate() {
  return {
    type: "session.update" as const,
    session: {
      type: "realtime" as const,
      model: OPENAI_REALTIME_MODEL,
      output_modalities: ["audio"] as const,
      max_output_tokens: 500,
      instructions: INSTANTMED_VOICE_AGENT_INSTRUCTIONS,
      audio: {
        input: {
          format: { type: "audio/pcmu" as const },
          turn_detection: {
            type: "semantic_vad" as const,
            create_response: true,
            interrupt_response: true,
          },
        },
        output: {
          format: { type: "audio/pcmu" as const },
          voice: "marin" as const,
        },
      },
      tool_choice: "auto" as const,
      tools: [
        {
          type: "function" as const,
          name: "create_callback_request",
          description:
            "Durably record one caller-confirmed callback request. Use for every adjustment, correction, clinical or prescription question, patient-specific matter, unresolved issue, or request outside the approved general facts.",
          parameters: {
            type: "object" as const,
            additionalProperties: false,
            required: ["caller_confirmed", "category", "summary"],
            properties: {
              callback_number: {
                type: "string",
                description: "Only include when the caller provides a number different from the number they called from.",
              },
              caller_name: {
                type: "string",
                description: "The caller's preferred name, if they provide it.",
              },
              caller_confirmed: {
                type: "boolean",
                const: true,
                description: "Set to true only after reading back the concise summary and receiving the caller's confirmation.",
              },
              category: {
                type: "string",
                enum: [
                  "account_or_payment",
                  "document_adjustment",
                  "prescription_or_clinical",
                  "technical_support",
                  "other",
                ],
              },
              summary: {
                type: "string",
                description: "A concise caller-confirmed summary. Include only information needed for the callback.",
              },
            },
          },
        },
      ],
    },
  }
}

type CreateCallback = (
  input: VoiceCallbackRequestInput,
) => Promise<VoiceCallbackRequestResult>

export async function executeVoiceCallbackTool(
  argumentsJson: string,
  session: TwilioVoiceSession,
  createCallback: CreateCallback = createVoiceCallbackRequest,
): Promise<string> {
  try {
    const args = callbackToolArgumentsSchema.parse(JSON.parse(argumentsJson))
    const callbackNumber = args.callback_number ?? session.caller
    if (!callbackNumber || callbackNumber === "anonymous") {
      return JSON.stringify({ recorded: false, reason: "callback_number_required" })
    }

    await createCallback({
      callbackNumber,
      callerName: args.caller_name,
      callSid: session.callSid,
      category: args.category,
      consentedAt: session.consentedAt,
      summary: args.summary,
    })

    return JSON.stringify({ recorded: true })
  } catch {
    return JSON.stringify({ recorded: false, reason: "request_not_confirmed" })
  }
}
