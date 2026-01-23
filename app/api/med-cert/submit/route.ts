import { NextRequest, NextResponse } from "next/server"
import { auth as _auth } from "@clerk/nextjs/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { headers } from "next/headers"
import { checkRateLimit, RATE_LIMIT_SENSITIVE } from "@/lib/rate-limit"
import { createLogger } from "@/lib/observability/logger"
const log = createLogger("route")
import { getApiAuth } from "@/lib/auth"
import type { SymptomId } from "@/types/med-cert"

// ============================================================================
// TYPES
// ============================================================================

interface SubmitRequestBody {
  certificateType: "work" | "study" | "carer"
  startDate: string
  durationDays: 1 | 2 | 3 | "extended"
  symptoms: SymptomId[]
  otherSymptomDetails?: string
  carerPersonName?: string
  carerRelationship?: string
  emergencyDisclaimerConfirmed: boolean
  emergencyDisclaimerTimestamp: string
  patientConfirmedAccurate: boolean
  patientConfirmedTimestamp: string
  escalatedToCall?: boolean
  templateVersion: string
}

interface SubmitResponse {
  success: boolean
  requestId?: string
  error?: string
  escalated?: boolean
}

// ============================================================================
// VALIDATION
// ============================================================================

function validateSubmission(body: Partial<SubmitRequestBody>): { valid: boolean; error?: string } {
  // Required fields
  if (!body.certificateType || !["work", "study", "carer"].includes(body.certificateType)) {
    return { valid: false, error: "Invalid certificate type" }
  }

  if (!body.startDate || !/^\d{4}-\d{2}-\d{2}$/.test(body.startDate)) {
    return { valid: false, error: "Invalid start date format" }
  }

  if (!body.durationDays || (body.durationDays !== "extended" && ![1, 2, 3].includes(body.durationDays))) {
    return { valid: false, error: "Duration must be 1, 2, 3, or 'extended'" }
  }

  if (!body.symptoms || !Array.isArray(body.symptoms) || body.symptoms.length === 0) {
    return { valid: false, error: "At least one symptom must be selected" }
  }

  // Safety confirmation required
  if (!body.emergencyDisclaimerConfirmed) {
    return { valid: false, error: "Emergency disclaimer must be confirmed" }
  }

  if (!body.patientConfirmedAccurate) {
    return { valid: false, error: "Patient must confirm information accuracy" }
  }

  // Carer validation
  if (body.certificateType === "carer") {
    if (!body.carerPersonName?.trim()) {
      return { valid: false, error: "Carer person name is required" }
    }
    if (!body.carerRelationship) {
      return { valid: false, error: "Carer relationship is required" }
    }
  }

  // Other symptom validation
  if (body.symptoms.includes("other") && !body.otherSymptomDetails?.trim()) {
    return { valid: false, error: "Please describe your 'other' symptoms" }
  }

  // Date validation - no backdating allowed (must be today or later)
  const startDate = new Date(body.startDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  startDate.setHours(0, 0, 0, 0)

  if (startDate < today) {
    return { valid: false, error: "Medical certificates cannot be backdated. Start date must be today or later." }
  }

  return { valid: true }
}

// ============================================================================
// POST - Submit new medical certificate request
// ============================================================================

export async function POST(request: NextRequest): Promise<NextResponse<SubmitResponse>> {
  try {
    // Rate limiting
    const headersList = await headers()
    const ip = headersList.get("x-forwarded-for") || "unknown"
    const rateLimitResult = checkRateLimit(`med-cert-submit:${ip}`, RATE_LIMIT_SENSITIVE)
    
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { success: false, error: "Too many requests. Please wait before submitting again." },
        { status: 429 }
      )
    }

    // Auth using Supabase
    const authResult = await getApiAuth()

    if (!authResult) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      )
    }

    const { profile } = authResult
    const supabase = createServiceRoleClient()

    // Parse body
    const body: Partial<SubmitRequestBody> = await request.json()

    // Validate
    const validation = validateSubmission(body)
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      )
    }

    // Calculate end date
    const startDate = new Date(body.startDate!)
    const durationDays = body.durationDays === "extended" ? 4 : body.durationDays!
    const endDate = new Date(startDate)
    endDate.setDate(endDate.getDate() + durationDays - 1)

    // Determine if escalation is needed
    const needsEscalation = body.durationDays === "extended" || body.escalatedToCall === true

    // Calculate price
    const amountCents = needsEscalation ? 3495 : 2495 // $34.95 or $24.95

    // Insert request
    const { data: newRequest, error: insertError } = await supabase
      .from("med_cert_requests")
      .insert({
        patient_id: profile.id,
        certificate_type: body.certificateType,
        start_date: body.startDate,
        end_date: endDate.toISOString().split("T")[0],
        duration_days: durationDays,
        symptoms: body.symptoms,
        other_symptom_text: body.otherSymptomDetails || null,
        carer_person_name: body.carerPersonName || null,
        carer_relationship: body.carerRelationship || null,
        emergency_disclaimer_confirmed: body.emergencyDisclaimerConfirmed,
        emergency_disclaimer_timestamp: body.emergencyDisclaimerTimestamp,
        patient_confirmed_accurate: body.patientConfirmedAccurate,
        patient_confirmed_timestamp: body.patientConfirmedTimestamp,
        escalated_to_call: needsEscalation,
        escalation_reason: needsEscalation ? (body.durationDays === "extended" ? "Duration exceeds 3 days" : "Patient requested call") : null,
        template_version: body.templateVersion || "2.0.0",
        amount_cents: amountCents,
        status: needsEscalation ? "escalated_to_call" : "pending_review",
      })
      .select("id")
      .single()

    if (insertError) {
      log.error("Error creating med cert request", { error: insertError })
      return NextResponse.json(
        { success: false, error: "Failed to create request" },
        { status: 500 }
      )
    }

    // Insert audit event
    await supabase.from("med_cert_audit_events").insert({
      request_id: newRequest.id,
      event_type: "request_submitted",
      actor_id: profile.id,
      actor_role: "patient",
      event_data: {
        symptoms_count: body.symptoms!.length,
        duration_days: durationDays,
        certificate_type: body.certificateType,
        is_carer: body.certificateType === "carer",
        escalated: needsEscalation,
        template_version: body.templateVersion,
      },
      ip_address: ip,
      user_agent: headersList.get("user-agent"),
    })

    return NextResponse.json({
      success: true,
      requestId: newRequest.id,
      escalated: needsEscalation,
    })

  } catch (error) {
    log.error("Med cert submission error", { error })
    return NextResponse.json(
      { success: false, error: "We couldn't submit your request. Please try again." },
      { status: 500 }
    )
  }
}
