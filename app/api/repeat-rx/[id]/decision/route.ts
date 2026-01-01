import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import type { ClinicianDecision } from "@/types/repeat-rx"

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
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }
    
    // Verify clinician role
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("user_id", session.user.id)
      .single()
    
    if (!profile || profile.role !== "clinician") {
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
    }
    
    // Create clinician decision record
    const { error: decisionError } = await supabase
      .from("clinician_decisions")
      .insert({
        request_id: id,
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
    
    // Log audit event
    await supabase.from("audit_events").insert({
      request_id: id,
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
    
    // TODO: Send notification to patient (email/SMS)
    // TODO: If approved, generate prescription PDF and send to eRx
    
    return NextResponse.json({
      success: true,
      decision: body.decision,
      message: `Request ${body.decision === "approved" ? "approved" : body.decision === "declined" ? "declined" : "marked for consult"}`,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { error: "Failed to submit decision", details: message },
      { status: 500 }
    )
  }
}
