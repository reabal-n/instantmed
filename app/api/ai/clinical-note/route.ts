import { NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { defaultModel } from "@/lib/ai/provider"
import { requireAuth } from "@/lib/auth"
import { createLogger } from "@/lib/observability/logger"
import { applyRateLimit } from "@/lib/rate-limit/redis"
import { createClient } from "@/lib/supabase/server"

const log = createLogger("ai-clinical-note")

/**
 * AI Clinical Note Generation
 * 
 * Generates a draft clinical note from patient intake answers.
 * IMPORTANT: This is a DRAFT only - requires doctor review and approval
 * before any patient-facing use.
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

const CLINICAL_NOTE_PROMPT = `You are a medical documentation assistant helping Australian GPs write clinical notes.

Generate a concise clinical note based on the patient intake information provided.

IMPORTANT RULES:
- This is a DRAFT note for doctor review only
- Use professional medical terminology appropriate for Australian healthcare
- Be factual and objective - only include information from the intake
- Do not make clinical diagnoses - that's for the reviewing doctor
- Format as a structured clinical note with clear sections
- Keep it concise but complete

OUTPUT FORMAT:
**Presenting Complaint:**
[Brief summary of symptoms/reason for consultation]

**History of Present Illness:**
[Details from intake including duration, symptom specifics]

**Relevant Information:**
[Any additional context from intake answers]

**Certificate Details:**
[If medical certificate: type, dates, duration]

---
*AI-generated draft - requires clinician review before use*`

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

    // Check for AI Gateway API key (or OIDC on Vercel)
    if (!process.env.AI_GATEWAY_API_KEY && !process.env.VERCEL) {
      log.error("AI_GATEWAY_API_KEY not configured")
      return NextResponse.json(
        { success: false, error: "AI service not configured", note: null },
        { status: 503 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { intakeId, answers } = body as { intakeId?: string; answers?: IntakeAnswers }

    if (!answers || Object.keys(answers).length === 0) {
      return NextResponse.json(
        { success: false, error: "No intake answers provided", note: null },
        { status: 400 }
      )
    }

    // Format intake data for the prompt
    const intakeContext = formatIntakeForPrompt(answers)

    // Generate clinical note via Vercel AI Gateway
    const { text } = await generateText({
      model: defaultModel,
      system: CLINICAL_NOTE_PROMPT,
      prompt: `Generate a clinical note based on this patient intake:\n\n${intakeContext}`,
    })

    log.info("Clinical note generated", { 
      intakeId, 
      doctorId: profile.id,
      noteLength: text.length 
    })

    return NextResponse.json({
      success: true,
      note: text,
      isDraft: true,
      generatedAt: new Date().toISOString(),
      generatedBy: "ai",
      requiresApproval: true,
    })

  } catch (error) {
    log.error("Error generating clinical note", { error })
    return NextResponse.json(
      { success: false, error: "Failed to generate note", note: null },
      { status: 500 }
    )
  }
}

function formatIntakeForPrompt(answers: IntakeAnswers): string {
  const lines: string[] = []

  if (answers.certificate_type) {
    lines.push(`Certificate Type: ${answers.certificate_type}`)
  }

  if (answers.symptoms && answers.symptoms.length > 0) {
    lines.push(`Symptoms: ${answers.symptoms.join(", ")}`)
  }

  if (answers.other_symptom_details) {
    lines.push(`Additional Symptom Details: ${answers.other_symptom_details}`)
  }

  if (answers.start_date) {
    lines.push(`Start Date: ${answers.start_date}`)
  }

  if (answers.end_date) {
    lines.push(`End Date: ${answers.end_date}`)
  }

  if (answers.duration_days) {
    lines.push(`Duration: ${answers.duration_days} day(s)`)
  }

  if (answers.carer_person_name) {
    lines.push(`Caring for: ${answers.carer_person_name}`)
  }

  if (answers.carer_relationship) {
    lines.push(`Relationship: ${answers.carer_relationship}`)
  }

  // Include any other relevant fields
  const excludedKeys = [
    'certificate_type', 'symptoms', 'other_symptom_details',
    'start_date', 'end_date', 'duration_days',
    'carer_person_name', 'carer_relationship',
    'emergency_disclaimer_confirmed', 'emergency_disclaimer_timestamp',
    'patient_confirmed_accurate', 'patient_confirmed_timestamp',
    'template_version', 'submitted_at'
  ]

  for (const [key, value] of Object.entries(answers)) {
    if (!excludedKeys.includes(key) && value !== null && value !== undefined) {
      const formattedKey = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
      lines.push(`${formattedKey}: ${String(value)}`)
    }
  }

  return lines.join("\n")
}
