/**
 * @deprecated This route is DEPRECATED - uses legacy med_cert_requests table.
 * 
 * The canonical approval flow is now:
 * - @/app/actions/approve-cert.ts (server action using intakes table)
 * - Called via @/app/doctor/intakes/[id]/document/actions.ts
 * 
 * This route is kept for backwards compatibility with any existing
 * integrations but should not be used for new development.
 * 
 * Migration: All new approvals should go through the intakes-based flow.
 */

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { headers } from "next/headers"
import { createLogger } from "@/lib/observability/logger"
const log = createLogger("route")
import { generateMedCertPdfFactory } from "@/lib/documents/med-cert-pdf-factory"
import { uploadPdfBuffer } from "@/lib/storage/documents"
import { createGeneratedDocument } from "@/lib/data/documents"
import { updateIntakeStatus } from "@/lib/data/intakes"
import { assertApprovalInvariants, ApprovalInvariantError } from "@/lib/approval/med-cert-invariants"
import { getApiAuth } from "@/lib/auth"
import { rateLimit } from "@/lib/rate-limit/limiter"
import { IntakeLifecycleError } from "@/lib/data/intake-lifecycle"
import {
  logClinicianReviewedRequest,
  logClinicianSelectedOutcome,
  logOutcomeAssigned,
  logTriageApproved,
  logTriageDeclined,
  logNoPrescribingInPlatform,
} from "@/lib/audit/compliance-audit"

// ============================================================================
// TYPES
// ============================================================================

interface DecisionBody {
  decision: "approve" | "reject" | "needs_call"
  rejectionReason?: string
  needsCallReason?: string
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

    // Auth check using Supabase
    const authResult = await getApiAuth()

    if (!authResult) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      )
    }

    const { userId, profile } = authResult

    // Rate limiting for clinician decisions
    const rateLimitResult = await rateLimit(userId, '/api/med-cert/decision')
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { success: false, error: "Too many requests. Please try again later." },
        { status: 429 }
      )
    }

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

    if (!body.decision || !["approve", "reject", "needs_call"].includes(body.decision)) {
      return NextResponse.json(
        { success: false, error: "Invalid decision. Must be 'approve', 'reject', or 'needs_call'" },
        { status: 400 }
      )
    }

    if (body.decision === "needs_call" && !body.needsCallReason?.trim()) {
      return NextResponse.json(
        { success: false, error: "Reason is required when requesting a call" },
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
        log.error("Failed to reject med cert request", { error: updateError, requestId })
        return NextResponse.json(
          { success: false, error: "Failed to update request" },
          { status: 500 }
        )
      }

      // Log audit event (legacy)
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

      // Compliance audit logging (AUDIT_LOGGING_REQUIREMENTS.md)
      await Promise.all([
        logClinicianReviewedRequest(requestId, "med_cert", profile.id, undefined, ip, headersList.get("user-agent") || undefined),
        logClinicianSelectedOutcome(requestId, "med_cert", profile.id, "declined", false, undefined, {
          rejectionReason: body.rejectionReason,
        }),
        logOutcomeAssigned(requestId, "med_cert", profile.id, "declined"),
        logTriageDeclined(requestId, "med_cert", profile.id, body.rejectionReason || ""),
        logNoPrescribingInPlatform(requestId, "med_cert", profile.id),
      ])

      return NextResponse.json({ success: true })
    }

    if (body.decision === "needs_call") {
      // Update request as needs_call
      const { error: updateError } = await supabase
        .from("med_cert_requests")
        .update({
          status: "needs_call",
          decision_at: now,
          decision_by: profile.id,
          needs_call_reason: body.needsCallReason,
        })
        .eq("id", requestId)

      if (updateError) {
        log.error("Failed to mark med cert request as needs_call", { error: updateError, requestId })
        return NextResponse.json(
          { success: false, error: "Failed to update request" },
          { status: 500 }
        )
      }

      // Log audit event (legacy)
      await supabase.from("med_cert_audit_events").insert({
        request_id: requestId,
        event_type: "decision_needs_call",
        actor_id: profile.id,
        actor_role: "clinician",
        event_data: {
          needs_call_reason: body.needsCallReason,
          clinical_notes: body.clinicalNotes || null,
        },
        ip_address: ip,
        user_agent: headersList.get("user-agent"),
      })

      // Compliance audit logging (AUDIT_LOGGING_REQUIREMENTS.md)
      const { logTriageNeedsCall } = await import("@/lib/audit/compliance-audit")
      await Promise.all([
        logClinicianReviewedRequest(requestId, "med_cert", profile.id, undefined, ip, headersList.get("user-agent") || undefined),
        logClinicianSelectedOutcome(requestId, "med_cert", profile.id, "needs_call", true, undefined, {
          needsCallReason: body.needsCallReason,
        }),
        logOutcomeAssigned(requestId, "med_cert", profile.id, "needs_call"),
        logTriageNeedsCall(requestId, "med_cert", profile.id, body.needsCallReason),
        logNoPrescribingInPlatform(requestId, "med_cert", profile.id),
      ])

      return NextResponse.json({ success: true })
    }

    // Approval flow - fetch draft, generate PDF, upload, and approve
    
    // Fetch the document draft for this request
    const { data: draft, error: draftError } = await supabase
      .from("document_drafts")
      .select("*")
      .eq("request_id", requestId)
      .eq("document_type", "med_cert")
      .single()

    if (draftError || !draft) {
      log.warn("No med cert draft found for request", { requestId })
      return NextResponse.json(
        { success: false, error: "Medical certificate draft not found. Doctor may need to create one." },
        { status: 400 }
      )
    }

    // Parse draft data (should be JSON)
    const draftData = typeof draft.document_data === "string" 
      ? JSON.parse(draft.document_data)
      : draft.document_data

    // Run approval invariants
    try {
      await assertApprovalInvariants(requestId)
    } catch (invariantError) {
      if (invariantError instanceof ApprovalInvariantError) {
        log.warn("Approval invariant failed", { requestId, error: invariantError.message })
        return NextResponse.json(
          { success: false, error: invariantError.message },
          { status: 400 }
        )
      }
      throw invariantError
    }

    // Generate PDF using consolidated factory
    let pdfUrl: string
    let certId: string
    try {
      const pdfResult = await generateMedCertPdfFactory({
        data: draftData,
        subtype: draft.subtype,
        requestId,
      })

      certId = pdfResult.certId
      log.info(`[decision] PDF generated: ${certId} (${pdfResult.size} bytes)`)

      // Upload to Supabase Storage
      const uploadResult = await uploadPdfBuffer(
        pdfResult.buffer,
        requestId,
        "med_cert",
        draft.subtype || "work"
      )

      if (!uploadResult.success || !uploadResult.permanentUrl) {
        log.error("Failed to upload PDF", { requestId, error: uploadResult.error })
        return NextResponse.json(
          { success: false, error: uploadResult.error || "Failed to upload certificate" },
          { status: 500 }
        )
      }

      pdfUrl = uploadResult.permanentUrl
      log.info(`[decision] PDF uploaded to ${pdfUrl}`)
    } catch (pdfError) {
      const errorMessage = pdfError instanceof Error ? pdfError.message : "Failed to generate PDF"
      log.error("PDF generation failed", { requestId, error: errorMessage })
      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: 500 }
      )
    }

    // Create generated document record
    const document = await createGeneratedDocument(
      requestId,
      "med_cert",
      draft.subtype || "work",
      pdfUrl
    )

    if (!document) {
      log.error("Failed to create generated document record", { requestId })
      return NextResponse.json(
        { success: false, error: "Failed to save certificate record" },
        { status: 500 }
      )
    }

    // Update intake status to approved
    let updatedIntake
    try {
      updatedIntake = await updateIntakeStatus(requestId, "approved", profile.id)
    } catch (lifecycleError) {
      if (lifecycleError instanceof IntakeLifecycleError) {
        log.warn("Lifecycle error on approval", { requestId, error: (lifecycleError as Error).message })
        return NextResponse.json(
          { success: false, error: (lifecycleError as Error).message },
          { status: 400 }
        )
      }
      throw lifecycleError
    }

    if (!updatedIntake) {
      log.error("Failed to update intake status", { requestId })
      return NextResponse.json(
        { success: false, error: "Failed to update intake status" },
        { status: 500 }
      )
    }

    // Log audit event for approval decision (legacy)
    await supabase.from("med_cert_audit_events").insert({
      request_id: requestId,
      event_type: "decision_approved",
      actor_id: profile.id,
      actor_role: "clinician",
      event_data: {
        clinical_notes: body.clinicalNotes || null,
        certificate_id: certId,
      },
      ip_address: ip,
      user_agent: headersList.get("user-agent"),
    })

    // Compliance audit logging (AUDIT_LOGGING_REQUIREMENTS.md)
    await Promise.all([
      logClinicianReviewedRequest(requestId, "med_cert", profile.id, undefined, ip, headersList.get("user-agent") || undefined),
      logClinicianSelectedOutcome(requestId, "med_cert", profile.id, "approved", false, undefined, {
        certificateId: certId,
      }),
      logOutcomeAssigned(requestId, "med_cert", profile.id, "approved"),
      logTriageApproved(requestId, "med_cert", profile.id, { certificateId: certId }),
      logNoPrescribingInPlatform(requestId, "med_cert", profile.id),
    ])

    return NextResponse.json({
      success: true,
      certificateId: certId,
      pdfUrl,
    })

  } catch (error) {
    log.error("Med cert decision error", { error })
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred" },
      { status: 500 }
    )
  }
}
