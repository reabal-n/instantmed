import { NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"
import { requireAuth } from "@/lib/auth"
import { createLogger } from "@/lib/observability/logger"
import { applyRateLimit } from "@/lib/rate-limit/redis"
import { createClient } from "@/lib/supabase/server"

const log = createLogger("ai-med-cert-draft")

/**
 * AI Medical Certificate Draft Generation
 * 
 * Generates a draft medical certificate text based on patient intake answers.
 * IMPORTANT: This is a DRAFT only - requires doctor review and approval
 * before generating the final certificate for the patient.
 */

interface IntakeAnswers {
  certificate_type?: string
  symptoms?: string[]
  other_symptom_details?: string
  start_date?: string
  end_date?: string
  duration_days?: number
  carer_person_name?: string
  carer_relationship?: string
  [key: string]: unknown
}

interface PatientInfo {
  fullName: string
  dateOfBirth?: string
}

const MED_CERT_DRAFT_PROMPT = `You are a medical documentation assistant helping Australian GPs draft medical certificates.

Generate a professional medical certificate statement based on the patient information and intake data provided.

IMPORTANT RULES:
- This is a DRAFT for doctor review only
- Use standard Australian medical certificate language
- Be factual and professional
- Do not include specific diagnoses (just indicate "medical condition")
- The certificate attests that the patient is/was unfit for work/study
- For carer's certificates, indicate the patient is required to care for someone

CERTIFICATE TEXT FORMAT:
"This is to certify that [Patient Name] attended a telehealth consultation on [Date].

In my opinion, [he/she/they] [is/was] suffering from a medical condition and [is/was] unfit for [work/normal duties/study] from [Start Date] to [End Date] inclusive ([X] day[s]).

[For carer's certificate only: This is to certify that [Patient Name] is required to provide care for [Person Name] ([Relationship]) who is suffering from a medical condition.]"

NOTES:
- Use gender-neutral "they" if gender unknown
- Keep language simple and professional
- This text will appear on the official certificate

---
*AI-generated draft - requires clinician review and approval before issuing*`

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user?.id) {
      const rateLimitResponse = await applyRateLimit(request, 'sensitive', user.id)
      if (rateLimitResponse) {
        return rateLimitResponse
      }
    }
    
    // Require doctor authentication
    const { profile } = await requireAuth("doctor")
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check for OpenAI API key
    if (!process.env.OPENAI_API_KEY) {
      log.error("OPENAI_API_KEY not configured")
      return NextResponse.json(
        { success: false, error: "AI service not configured", draft: null },
        { status: 503 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { intakeId, answers, patient } = body as { 
      intakeId?: string
      answers?: IntakeAnswers
      patient?: PatientInfo
    }

    if (!answers || Object.keys(answers).length === 0) {
      return NextResponse.json(
        { success: false, error: "No intake answers provided", draft: null },
        { status: 400 }
      )
    }

    if (!patient?.fullName) {
      return NextResponse.json(
        { success: false, error: "Patient name required", draft: null },
        { status: 400 }
      )
    }

    // Format context for the prompt
    const context = formatMedCertContext(answers, patient)

    // Generate med cert draft using AI
    const { text } = await generateText({
      model: openai("gpt-4o-mini"),
      system: MED_CERT_DRAFT_PROMPT,
      prompt: `Generate a medical certificate statement for:\n\n${context}`,
    })

    log.info("Med cert draft generated", { 
      intakeId, 
      doctorId: profile.id,
      certificateType: answers.certificate_type,
      draftLength: text.length 
    })

    return NextResponse.json({
      success: true,
      draft: text,
      isDraft: true,
      generatedAt: new Date().toISOString(),
      generatedBy: "ai",
      requiresApproval: true,
      metadata: {
        certificateType: answers.certificate_type,
        startDate: answers.start_date,
        endDate: answers.end_date,
        durationDays: answers.duration_days,
      }
    })

  } catch (error) {
    log.error("Error generating med cert draft", { error })
    return NextResponse.json(
      { success: false, error: "Failed to generate draft", draft: null },
      { status: 500 }
    )
  }
}

function formatMedCertContext(answers: IntakeAnswers, patient: PatientInfo): string {
  const lines: string[] = []

  lines.push(`Patient Name: ${patient.fullName}`)
  
  if (patient.dateOfBirth) {
    lines.push(`Date of Birth: ${patient.dateOfBirth}`)
  }

  lines.push(`Consultation Date: ${new Date().toLocaleDateString("en-AU")}`)

  if (answers.certificate_type) {
    const typeLabels: Record<string, string> = {
      work: "Work/Normal Duties",
      study: "Study/University",
      carer: "Carer's Certificate"
    }
    lines.push(`Certificate Type: ${typeLabels[answers.certificate_type] || answers.certificate_type}`)
  }

  if (answers.start_date) {
    lines.push(`Absence Start Date: ${answers.start_date}`)
  }

  if (answers.end_date) {
    lines.push(`Absence End Date: ${answers.end_date}`)
  }

  if (answers.duration_days) {
    lines.push(`Duration: ${answers.duration_days} day(s)`)
  }

  if (answers.symptoms && answers.symptoms.length > 0) {
    lines.push(`Reported Symptoms: ${answers.symptoms.join(", ")}`)
  }

  if (answers.other_symptom_details) {
    lines.push(`Additional Details: ${answers.other_symptom_details}`)
  }

  // Carer-specific fields
  if (answers.certificate_type === "carer") {
    if (answers.carer_person_name) {
      lines.push(`Person Being Cared For: ${answers.carer_person_name}`)
    }
    if (answers.carer_relationship) {
      lines.push(`Relationship: ${answers.carer_relationship}`)
    }
  }

  return lines.join("\n")
}
