import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { notifyRequestStatusChange } from "@/lib/notifications/service"
import { createLogger } from "@/lib/observability/logger"
const log = createLogger("route")
import type { ClinicianDecision } from "@/types/repeat-rx"
import {
  logClinicianReviewedRequest,
  logClinicianSelectedOutcome,
  logOutcomeAssigned,
  logTriageApproved,
  logTriageDeclined,
  logTriageNeedsCall,
  logExternalPrescribingIndicated,
} from "@/lib/audit/compliance-audit"
import { requireValidCsrf } from "@/lib/security/csrf"

interface DecisionPayload {
  decision: ClinicianDecision
  decisionReason: string
  pbsSchedule?: string | null
  packQuantity?: number | null
  doseInstructions?: string | null
  frequency?: string | null
  repeatsGranted?: number
  clinicalNotes?: string | null
  redFlagReview?: string | null
}

/**
 * POST /api/repeat-rx/[id]/decision
 * Submit a clinician decision for a repeat prescription request
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // CSRF protection for session-based requests
    const csrfError = await requireValidCsrf(request)
    if (csrfError) {
      return csrfError
    }

    const { id } = await params
    const body = await request.json() as DecisionPayload
    
    // Validate required fields
    if (!body.decision) {
      return NextResponse.json(
        { error: "Decision is required" },
        { status: 400 }
      )
    }
    
    if (!body.decisionReason?.trim()) {
      return NextResponse.json(
        { error: "Decision reason is required" },
        { status: 400 }
      )
    }
    
    // Get authenticated clinician
    const { userId } = await auth()
    const supabase = createServiceRoleClient()
    
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }
    
    // Verify clinician role
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("clerk_user_id", userId)
      .single()

    if (!profile || !["clinician", "doctor", "admin"].includes(profile.role)) {
      return NextResponse.json(
        { error: "Forbidden: Must be a clinician" },
        { status: 403 }
      )
    }
    
    // Verify request exists and is in reviewable state
    const { data: existingRequest, error: fetchError } = await supabase
      .from("repeat_rx_requests")
      .select("id, status, patient_id")
      .eq("id", id)
      .single()
    
    if (fetchError || !existingRequest) {
      return NextResponse.json(
        { error: "Request not found" },
        { status: 404 }
      )
    }
    
    if (!["pending", "requires_consult"].includes(existingRequest.status)) {
      return NextResponse.json(
        { error: "Request has already been decided" },
        { status: 400 }
      )
    }
    
    // Map decision to status
    const statusMap: Record<ClinicianDecision, string> = {
      approved: "approved",
      declined: "declined",
      requires_consult: "requires_consult",
      needs_call: "requires_consult", // Alias for requires_consult
    }
    
    // Create clinician decision record
    const { error: decisionError } = await supabase
      .from("clinician_decisions")
      .insert({
        intake_id: id,
        clinician_id: profile.id,
        decision: body.decision,
        decision_reason: body.decisionReason,
        pbs_schedule: body.pbsSchedule,
        pack_quantity: body.packQuantity,
        dose_instructions: body.doseInstructions,
        frequency: body.frequency,
        repeats_granted: body.repeatsGranted || 0,
        clinical_notes: body.clinicalNotes,
        red_flag_review: body.redFlagReview,
      })
    
    if (decisionError) {
      throw new Error(`Failed to create decision: ${decisionError.message}`)
    }
    
    // Update request status
    const { error: updateError } = await supabase
      .from("repeat_rx_requests")
      .update({
        status: statusMap[body.decision],
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", id)
    
    if (updateError) {
      throw new Error(`Failed to update request: ${updateError.message}`)
    }
    
    // Log audit event (legacy)
    const { error: auditError } = await supabase.from("audit_events").insert({
      intake_id: id,
      patient_id: existingRequest.patient_id,
      event_type: "clinician_decision",
      payload: {
        decision: body.decision,
        clinician_id: profile.id,
        has_clinical_notes: Boolean(body.clinicalNotes),
        has_red_flag_review: Boolean(body.redFlagReview),
      },
      actor_type: "clinician",
      actor_id: profile.id,
      ip_address: request.headers.get("x-forwarded-for") || "unknown",
      user_agent: request.headers.get("user-agent") || "unknown",
    })

    if (auditError) {
      log.error("Failed to log clinician decision audit event", { intakeId: id, error: auditError.message })
    }
    
    // Compliance audit logging (AUDIT_LOGGING_REQUIREMENTS.md)
    const ip = request.headers.get("x-forwarded-for") || undefined
    const userAgent = request.headers.get("user-agent") || undefined
    const triageOutcome = body.decision === "approved" ? "approved" 
      : body.decision === "requires_consult" ? "needs_call" 
      : "declined"
    
    const compliancePromises = [
      logClinicianReviewedRequest(id, "repeat_rx", profile.id, undefined, ip, userAgent),
      logClinicianSelectedOutcome(id, "repeat_rx", profile.id, triageOutcome, 
        body.decision === "requires_consult", undefined, {
          decisionReason: body.decisionReason,
        }),
      logOutcomeAssigned(id, "repeat_rx", profile.id, triageOutcome),
    ]
    
    if (body.decision === "approved") {
      compliancePromises.push(
        logTriageApproved(id, "repeat_rx", profile.id, { repeatsGranted: body.repeatsGranted }),
        // Repeat Rx requires external prescribing (Parchment/PBS)
        logExternalPrescribingIndicated(id, "repeat_rx", profile.id, "Parchment/PBS")
      )
    } else if (body.decision === "declined") {
      compliancePromises.push(
        logTriageDeclined(id, "repeat_rx", profile.id, body.decisionReason)
      )
    } else if (body.decision === "requires_consult") {
      compliancePromises.push(
        logTriageNeedsCall(id, "repeat_rx", profile.id, body.decisionReason)
      )
    }
    
    // Compliance logging shouldn't crash the endpoint
    try {
      await Promise.all(compliancePromises)
    } catch (complianceError) {
      log.error("Compliance logging failed (non-fatal)", {}, complianceError instanceof Error ? complianceError : new Error(String(complianceError)))
    }

    // After approval, create script task for Parchment dispatch
    if (body.decision === "approved") {
      try {
        const { createScriptTask } = await import("@/lib/data/script-tasks")
        // Get medication details from the request
        const { data: rxRequest } = await supabase
          .from("repeat_rx_requests")
          .select("medication_display, medication_strength, medication_form, guest_email")
          .eq("id", id)
          .single()

        // Get patient info
        const { data: patientProfile } = await supabase
          .from("profiles")
          .select("full_name, email")
          .eq("id", existingRequest.patient_id)
          .single()

        await createScriptTask({
          repeat_rx_request_id: id,
          doctor_id: profile.id,
          patient_name: patientProfile?.full_name || "Unknown",
          patient_email: patientProfile?.email || rxRequest?.guest_email || undefined,
          medication_name: rxRequest?.medication_display || undefined,
          medication_strength: rxRequest?.medication_strength || undefined,
          medication_form: rxRequest?.medication_form || undefined,
        })
      } catch (scriptErr) {
        log.error("Failed to create script task (non-fatal)", {
          error: scriptErr instanceof Error ? scriptErr.message : "Unknown",
          intakeId: id,
        })
      }
    }

    // Send notification to patient (email/SMS)
    try {
      // Get patient details for notification
      const { data: patientProfile } = await supabase
        .from("profiles")
        .select("id, full_name, email, clerk_user_id")
        .eq("id", existingRequest.patient_id)
        .single()
      
      if (patientProfile) {
        await notifyRequestStatusChange({
          intakeId: id,
          patientId: patientProfile.id,
          patientEmail: patientProfile.email || "",
          patientName: patientProfile.full_name || "there",
          requestType: "prescription",
          newStatus: body.decision === "approved" ? "approved" : body.decision === "declined" ? "declined" : "pending",
          documentUrl: undefined, // PDF generated separately if approved
        })
        log.info("[Repeat Rx Decision] Patient notified", { intakeId: id, decision: body.decision })
      }
    } catch (notifyError) {
      // Log but don't fail the request - notification is not critical
      log.error("[Repeat Rx Decision] Failed to notify patient", { 
        error: notifyError instanceof Error ? notifyError.message : "Unknown error",
        intakeId: id
      })
    }
    
    return NextResponse.json({
      success: true,
      decision: body.decision,
      message: `Request ${body.decision === "approved" ? "approved" : body.decision === "declined" ? "declined" : "marked for consult"}`,
    })
  } catch (error) {
    log.error("Failed to submit decision", {
      error: error instanceof Error ? error.message : "Unknown error",
    })
    return NextResponse.json(
      { error: "Failed to submit decision" },
      { status: 500 }
    )
  }
}
