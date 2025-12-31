import { NextRequest, NextResponse } from "next/server"
import { createOpenAI } from "@ai-sdk/openai"
import { generateText } from "ai"
import { requireAuth } from "@/lib/auth"

// Initialize OpenAI with Vercel AI Gateway
const openai = createOpenAI({
  apiKey: process.env.VERCEL_AI_GATEWAY_API_KEY,
  baseURL: "https://gateway.ai.vercel.com/v1/openai",
})

interface DeclineReasonRequest {
  patientName: string
  requestType: string
  requestSubtype: string
  questionnaire: Record<string, unknown>
  declineCategory: "clinical" | "service" | "compliance" | "safety" | "incomplete"
  additionalContext?: string
}

const DECLINE_REASON_SYSTEM_PROMPT = `You are a clinical communication assistant for InstantMed, an Australian telehealth platform. Your task is to generate compassionate, professional decline messages for patient email notifications.

Guidelines:
1. Be empathetic and professional - the patient's health concern is valid
2. Explain the reason clearly without being dismissive
3. Provide actionable next steps (e.g., see their regular GP, visit urgent care)
4. Keep the message to 2-3 short paragraphs
5. Do NOT include specific clinical details that shouldn't be in email
6. Mention the refund will be processed if applicable
7. Use simple language, avoid medical jargon

Decline Categories and Suggested Reasons:
- clinical: Condition requires in-person examination or is outside telehealth scope
- service: The requested service has been discontinued or isn't appropriate
- compliance: Request doesn't meet prescribing guidelines (e.g., S8 medications, first-time prescriptions)
- safety: Safety concerns require immediate in-person care
- incomplete: Information provided is insufficient for clinical decision

Output only the email message content. No greeting (Dear X) or sign-off - those are handled by the template.`

export async function POST(request: NextRequest) {
  try {
    // Require doctor authentication
    const { profile } = await requireAuth("doctor")
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body: DeclineReasonRequest = await request.json()
    const {
      patientName,
      requestType,
      requestSubtype,
      questionnaire,
      declineCategory,
      additionalContext,
    } = body

    const serviceTypeLabel = {
      medical_certificate: "medical certificate",
      prescription: "prescription",
      consult: "consultation",
      referral: "referral",
    }[requestType] || requestType

    // Extract key questionnaire details for context
    const relevantDetails = Object.entries(questionnaire)
      .filter(([key]) => key.includes("reason") || key.includes("condition") || key.includes("symptom"))
      .slice(0, 5) // Limit context
      .map(([key, value]) => `${key}: ${value}`)
      .join(", ")

    const prompt = `Generate a decline reason message for a patient named ${patientName.split(" ")[0]}.

**Request Type:** ${serviceTypeLabel} (${requestSubtype})
**Decline Category:** ${declineCategory}
${relevantDetails ? `**Request Context:** ${relevantDetails}` : ""}
${additionalContext ? `**Doctor's Notes:** ${additionalContext}` : ""}

Generate a compassionate but clear decline message explaining why this request cannot be approved through our telehealth service and what the patient should do next.`

    const { text } = await generateText({
      model: openai("gpt-4o-mini"),
      system: DECLINE_REASON_SYSTEM_PROMPT,
      prompt,
      maxOutputTokens: 300,
      temperature: 0.5,
    })

    return NextResponse.json({
      success: true,
      reason: text,
    })
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error generating decline reason:", error)
    return NextResponse.json(
      { error: "Failed to generate decline reason" },
      { status: 500 }
    )
  }
}
