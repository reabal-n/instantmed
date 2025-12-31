import { NextRequest, NextResponse } from "next/server"
import { createOpenAI } from "@ai-sdk/openai"
import { generateText } from "ai"
import { requireAuth } from "@/lib/auth"

// Initialize OpenAI with Vercel AI Gateway
const openai = createOpenAI({
  apiKey: process.env.VERCEL_AI_GATEWAY_API_KEY,
  baseURL: "https://gateway.ai.vercel.com/v1/openai",
})

interface ClinicalNoteRequest {
  patientName: string
  patientAge: number
  requestType: string // e.g., "medical_certificate", "prescription", etc.
  requestSubtype: string // e.g., "work", "uni", "repeat"
  questionnaire: Record<string, unknown>
  redFlags: boolean
  existingNote?: string // If doctor wants to refine existing note
}

const SOAP_SYSTEM_PROMPT = `You are a clinical documentation assistant for InstantMed, an Australian telehealth platform. Your task is to generate concise SOAP-format clinical notes for doctor review.

SOAP Format Guidelines:
- S (Subjective): Patient-reported symptoms, concerns, and history from questionnaire
- O (Objective): Observable/measurable data (age, location, screening results)
- A (Assessment): Clinical impression based on request type and responses
- P (Plan): Treatment plan appropriate to the service (certificate, prescription, etc.)

Rules:
1. Be concise - each section should be 1-3 sentences
2. Use Australian medical terminology and abbreviations where appropriate
3. For medical certificates, focus on fitness for work/study assessment
4. For prescriptions, include medication safety considerations
5. Flag any concerning responses but maintain professional clinical language
6. Do NOT include personal identifiers like full Medicare numbers
7. Notes should be suitable for medicolegal documentation

Output only the SOAP note with clear section headers (S:, O:, A:, P:). No preamble or explanation.`

export async function POST(request: NextRequest) {
  try {
    // Require doctor authentication
    const { profile } = await requireAuth("doctor")
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body: ClinicalNoteRequest = await request.json()
    const {
      patientName,
      patientAge,
      requestType,
      requestSubtype,
      questionnaire,
      redFlags,
      existingNote,
    } = body

    // Build context for the AI
    const formattedQuestionnaire = Object.entries(questionnaire)
      .filter(([, value]) => value !== null && value !== undefined && value !== "")
      .map(([key, value]) => {
        const label = key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
        return `- ${label}: ${typeof value === "boolean" ? (value ? "Yes" : "No") : value}`
      })
      .join("\n")

    const serviceTypeLabel = {
      medical_certificate: "Medical Certificate",
      prescription: "Prescription",
      consult: "General Consultation",
      referral: "Referral",
    }[requestType] || requestType

    const prompt = `Generate a SOAP clinical note for the following telehealth encounter:

**Patient:** ${patientName.split(" ")[0]} (first name only), ${patientAge} years old
**Service:** ${serviceTypeLabel} - ${requestSubtype}
**Safety Flags:** ${redFlags ? "⚠️ Red flags identified in screening" : "No safety concerns flagged"}

**Questionnaire Responses:**
${formattedQuestionnaire || "No questionnaire responses available"}

${existingNote ? `**Doctor's existing notes to incorporate:**\n${existingNote}\n` : ""}

Generate a professional SOAP note for this encounter.`

    const { text } = await generateText({
      model: openai("gpt-4o-mini"),
      system: SOAP_SYSTEM_PROMPT,
      prompt,
      maxOutputTokens: 500,
      temperature: 0.3, // Low temperature for consistent clinical documentation
    })

    return NextResponse.json({
      success: true,
      note: text,
    })
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error generating clinical note:", error)
    return NextResponse.json(
      { error: "Failed to generate clinical note" },
      { status: 500 }
    )
  }
}
