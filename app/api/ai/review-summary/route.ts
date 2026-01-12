import { NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { createClient } from "@/lib/supabase/server"

export const runtime = "edge"

/**
 * Doctor Review Summary Generator
 * 
 * Generates a concise 2-3 line clinical summary for doctors reviewing requests.
 * Helps doctors quickly understand the key information without reading all details.
 */

interface ReviewSummaryRequest {
  requestId: string
  requestType: "med_cert" | "repeat_rx" | "consult"
}

interface MedCertAnswers {
  certType?: string
  duration?: string
  selectedSymptoms?: string[]
  symptomDescription?: string
  additionalNotes?: string
  carerPatientName?: string
  carerRelationship?: string
  startDate?: string
  specificDateFrom?: string
  specificDateTo?: string
}

interface RepeatRxAnswers {
  medication?: {
    product_name?: string
    active_ingredients_raw?: string
  }
  indication?: string
  currentDose?: string
  lastPrescribed?: string
  stability?: string
  prescriber?: string
  doseChanged?: boolean
  sideEffects?: string
}

interface ConsultAnswers {
  consultReason?: string
  consultDetails?: string
  currentMedications?: string
}

export async function POST(req: NextRequest) {
  try {
    const body: ReviewSummaryRequest = await req.json()
    const { requestId, requestType } = body

    if (!requestId) {
      return NextResponse.json({ error: "Request ID required" }, { status: 400 })
    }

    // Fetch the request data
    const supabase = await createClient()
    const { data: request, error } = await supabase
      .from("requests")
      .select(`
        *,
        profiles:patient_id (
          full_name,
          date_of_birth
        ),
        answers (
          answers
        )
      `)
      .eq("id", requestId)
      .single()

    if (error || !request) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 })
    }

    const answers = request.answers?.answers || {}
    const patientName = request.profiles?.full_name || "Patient"
    const patientDob = request.profiles?.date_of_birth
    const patientAge = patientDob ? calculateAge(patientDob) : null

    // Build context based on request type
    let context = ""
    let prompt = ""

    if (requestType === "med_cert") {
      const medCertAnswers = answers as MedCertAnswers
      const isCarer = medCertAnswers.certType === "carer"
      
      context = `
Medical Certificate Request:
- Type: ${medCertAnswers.certType || "work"} ${isCarer ? `(caring for: ${medCertAnswers.carerPatientName})` : ""}
- Duration: ${medCertAnswers.duration || "1"} day(s)
- Start Date: ${medCertAnswers.startDate || medCertAnswers.specificDateFrom || "today"}
- Symptoms: ${medCertAnswers.selectedSymptoms?.join(", ") || "Not specified"}
- Description: ${medCertAnswers.symptomDescription || medCertAnswers.additionalNotes || "None provided"}
- Patient: ${patientName}${patientAge ? `, ${patientAge}yo` : ""}
`

      prompt = `You are a medical intake summarizer. Generate a brief 2-3 line clinical summary for a doctor reviewing this medical certificate request.

${context}

Write a concise summary that highlights:
1. Patient demographics and certificate type
2. Key symptoms/reason
3. Any notable flags or standard presentation

Use clinical shorthand where appropriate (e.g., "2/7" for 2 days, "yo" for years old).
Keep it factual and neutral. Do not make clinical recommendations.
Return ONLY the summary text, no labels or formatting.`

    } else if (requestType === "repeat_rx") {
      const rxAnswers = answers as RepeatRxAnswers
      
      context = `
Repeat Prescription Request:
- Medication: ${rxAnswers.medication?.product_name || "Unknown"}
- Active Ingredient: ${rxAnswers.medication?.active_ingredients_raw || "Unknown"}
- Indication: ${rxAnswers.indication || "Not specified"}
- Current Dose: ${rxAnswers.currentDose || "Not specified"}
- Last Prescribed: ${rxAnswers.lastPrescribed || "Unknown"}
- On stable dose: ${rxAnswers.stability || "Unknown"}
- Original Prescriber: ${rxAnswers.prescriber || "Unknown"}
- Dose Changed: ${rxAnswers.doseChanged ? "Yes" : "No"}
- Side Effects: ${rxAnswers.sideEffects || "None reported"}
- Patient: ${patientName}${patientAge ? `, ${patientAge}yo` : ""}
`

      prompt = `You are a medical intake summarizer. Generate a brief 2-3 line clinical summary for a doctor reviewing this repeat prescription request.

${context}

Write a concise summary that highlights:
1. Medication and indication
2. Stability and compliance indicators
3. Any flags (dose changes, side effects, etc.)

Use clinical shorthand where appropriate.
Keep it factual and neutral. Do not make clinical recommendations.
Return ONLY the summary text, no labels or formatting.`

    } else if (requestType === "consult") {
      const consultAnswers = answers as ConsultAnswers
      
      context = `
GP Consultation Request:
- Reason: ${consultAnswers.consultReason || "General"}
- Details: ${consultAnswers.consultDetails || "Not specified"}
- Current Medications: ${consultAnswers.currentMedications || "None listed"}
- Patient: ${patientName}${patientAge ? `, ${patientAge}yo` : ""}
`

      prompt = `You are a medical intake summarizer. Generate a brief 2-3 line clinical summary for a doctor reviewing this consultation request.

${context}

Write a concise summary that highlights:
1. Patient demographics and main concern
2. Key clinical details
3. Any relevant background

Use clinical shorthand where appropriate.
Keep it factual and neutral. Do not make clinical recommendations.
Return ONLY the summary text, no labels or formatting.`
    } else {
      return NextResponse.json({ error: "Invalid request type" }, { status: 400 })
    }

    // Generate summary
    const { text } = await generateText({
      model: "openai/gpt-4o-mini",
      prompt,
    })

    return NextResponse.json({
      summary: text.trim(),
      requestId,
      requestType,
    })
  } catch (_error) {
    return NextResponse.json(
      { error: "Failed to generate summary" },
      { status: 500 }
    )
  }
}

function calculateAge(dateOfBirth: string): number {
  const today = new Date()
  const birth = new Date(dateOfBirth)
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }
  return age
}
