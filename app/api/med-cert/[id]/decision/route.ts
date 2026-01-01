import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { headers } from "next/headers"
import { logger } from "@/lib/logger"
import { generateMedCertPdf, generateCertificateNumber } from "@/lib/pdf/generate-med-cert"
import { getApiAuth } from "@/lib/auth"

// ============================================================================
// TYPES
// ============================================================================

interface DecisionBody {
  decision: "approve" | "reject"
  rejectionReason?: string
  clinicalNotes?: string
}

interface DecisionResponse {
  success: boolean
  certificateId?: string
  pdfUrl?: string
  error?: string
}

// ============================================================================
// PATCH - Clinician decision on medical certificate request
// ============================================================================

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<DecisionResponse>> {
  try {
    const { id: requestId } = await params
    const headersList = await headers()
    const ip = headersList.get("x-forwarded-for") || "unknown"

    // Auth check using Clerk
    const authResult = await getApiAuth()

    if (!authResult) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      )
    }

    const { userId, profile } = authResult

    // Verify clinician role
    if (!["clinician", "doctor", "admin"].includes(profile.role)) {
      return NextResponse.json(
        { success: false, error: "Clinician access required" },
        { status: 403 }
      )
    }

    const supabase = await createClient()

    // Parse body
    const body: DecisionBody = await request.json()

    if (!body.decision || !["approve", "reject"].includes(body.decision)) {
      return NextResponse.json(
        { success: false, error: "Invalid decision. Must be 'approve' or 'reject'" },
        { status: 400 }
      )
    }

    if (body.decision === "reject" && !body.rejectionReason?.trim()) {
      return NextResponse.json(
        { success: false, error: "Rejection reason is required" },
        { status: 400 }
      )
    }

    // Fetch the request
    const { data: certRequest, error: fetchError } = await supabase
      .from("med_cert_requests")
      .select("*")
      .eq("id", requestId)
      .single()

    if (fetchError || !certRequest) {
      return NextResponse.json(
        { success: false, error: "Request not found" },
        { status: 404 }
      )
    }

    // Validate request can be decided
    const validStatuses = ["pending", "pending_review", "under_review"] as const
    if (!validStatuses.includes(certRequest.status as typeof validStatuses[number])) {
      return NextResponse.json(
        { success: false, error: `Cannot decide on request with status: ${certRequest.status}` },
        { status: 400 }
      )
    }

    const now = new Date().toISOString()

    if (body.decision === "reject") {
      // Update request as rejected
      const { error: updateError } = await supabase
        .from("med_cert_requests")
        .update({
          status: "declined",
          decision_at: now,
          decision_by: profile.id,
          rejection_reason: body.rejectionReason,
        })
        .eq("id", requestId)

      if (updateError) {
        logger.error("Failed to reject med cert request", { error: updateError, requestId })
        return NextResponse.json(
          { success: false, error: "Failed to update request" },
          { status: 500 }
        )
      }

      // Log audit event
      await supabase.from("med_cert_audit_events").insert({
        request_id: requestId,
        event_type: "decision_rejected",
        actor_id: profile.id,
        actor_role: "clinician",
        event_data: {
          rejection_reason: body.rejectionReason,
          clinical_notes: body.clinicalNotes || null,
        },
        ip_address: ip,
        user_agent: headersList.get("user-agent"),
      })

      return NextResponse.json({ success: true })
    }

    // Approval flow - generate certificate
    
    // Fetch patient details with auth info for email
    const { data: patientProfile } = await supabase
      .from("profiles")
      .select("id, full_name, date_of_birth, auth_user_id")
      .eq("id", certRequest.patient_id)
      .single()

    if (!patientProfile) {
      return NextResponse.json(
        { success: false, error: "Patient profile not found" },
        { status: 404 }
      )
    }

    // Get patient email from auth
    const { data: authUser } = await supabase.auth.admin.getUserById(patientProfile.auth_user_id)
    const patientEmail = authUser?.user?.email

    if (!patientEmail) {
      return NextResponse.json(
        { success: false, error: "Patient email not found" },
        { status: 404 }
      )
    }

    // Generate certificate number
    const certificateNumber = generateCertificateNumber()

    // Build symptoms summary
    const symptoms = certRequest.symptoms as string[]
    const symptomsSummary = symptoms.join(", ") + (certRequest.other_symptom_text ? ` (${certRequest.other_symptom_text})` : "")

    // Calculate duration
    const startDate = new Date(certRequest.start_date)
    const endDate = new Date(certRequest.end_date)
    const durationDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1

    // Generate PDF with react-pdf, upload to Supabase, send email
    const pdfResult = await generateMedCertPdf({
      requestId,
      patientId: patientProfile.id,
      certificateNumber,
      certificateType: certRequest.certificate_type,
      patientName: patientProfile.full_name || "Unknown",
      patientDob: patientProfile.date_of_birth,
      patientEmail,
      startDate: certRequest.start_date,
      endDate: certRequest.end_date,
      durationDays,
      symptomsSummary,
      carerPersonName: certRequest.carer_person_name || undefined,
      carerRelationship: certRequest.carer_relationship || undefined,
      clinicianId: profile.id,
      clinicianName: profile.full_name || "Unknown Clinician",
      clinicianRegistration: profile.ahpra_number || "AHPRA Registered",
    })

    if (!pdfResult.success) {
      logger.error("Failed to generate med cert PDF", { error: pdfResult.error, requestId })
      return NextResponse.json(
        { success: false, error: pdfResult.error || "Failed to generate certificate" },
        { status: 500 }
      )
    }

    // Update request as approved
    const { error: updateError } = await supabase
      .from("med_cert_requests")
      .update({
        status: "approved",
        decision_at: now,
        decision_by: profile.id,
        certificate_id: pdfResult.certificateId,
      })
      .eq("id", requestId)

    if (updateError) {
      logger.error("Failed to approve med cert request", { error: updateError, requestId })
      return NextResponse.json(
        { success: false, error: "Failed to update request" },
        { status: 500 }
      )
    }

    // Log audit event for approval decision
    await supabase.from("med_cert_audit_events").insert({
      request_id: requestId,
      event_type: "decision_approved",
      actor_id: profile.id,
      actor_role: "clinician",
      event_data: {
        clinical_notes: body.clinicalNotes || null,
        certificate_id: pdfResult.certificateId,
      },
      ip_address: ip,
      user_agent: headersList.get("user-agent"),
    })

    return NextResponse.json({
      success: true,
      certificateId: pdfResult.certificateId,
      pdfUrl: pdfResult.pdfUrl,
    })

  } catch (error) {
    logger.error("Med cert decision error", { error })
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred" },
      { status: 500 }
    )
  }
}
