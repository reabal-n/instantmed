import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/server"
import { checkEligibility, generateSuggestedDecision } from "@/lib/repeat-rx/rules-engine"
import type {
  ClinicalSummary,
  RepeatRxSubmitPayload,
} from "@/types/repeat-rx"

/**
 * POST /api/repeat-rx/submit
 * Submit a repeat prescription request
 * 
 * Creates:
 * - repeat_rx_requests record
 * - repeat_rx_answers record (immutable)
 * - audit_events entry
 * - Generates clinical summary for doctor dashboard
 */
export async function POST(request: Request) {
  try {
    const body = await request.json() as RepeatRxSubmitPayload
    const { medication, answers, consentTimestamps, pharmacyDetails } = body
    
    // Validate required fields
    if (!medication || !medication.amt_code) {
      return NextResponse.json(
        { error: "Medication is required" },
        { status: 400 }
      )
    }
    
    if (!answers) {
      return NextResponse.json(
        { error: "Answers are required" },
        { status: 400 }
      )
    }
    
    // Check consent timestamps
    if (!consentTimestamps?.emergencyDisclaimer) {
      return NextResponse.json(
        { error: "Emergency disclaimer consent required" },
        { status: 400 }
      )
    }
    
    if (!consentTimestamps?.gpAttestation) {
      return NextResponse.json(
        { error: "GP attestation consent required" },
        { status: 400 }
      )
    }
    
    // Get client IP and user agent for audit
    const ipAddress = request.headers.get("x-forwarded-for") || "unknown"
    const userAgent = request.headers.get("user-agent") || "unknown"
    
    // Get user session
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    
    let patientId: string | null = null
    let isGuest = true
    
    if (session?.user) {
      // Get patient profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", session.user.id)
        .single()
      
      patientId = profile?.id || null
      isGuest = !patientId
    }
    
    // Run eligibility check
    const eligibilityResult = checkEligibility(medication, answers)
    const suggestedDecision = generateSuggestedDecision(eligibilityResult)
    
    // Generate clinical summary for doctor dashboard
    const clinicalSummary: ClinicalSummary = {
      patient: {
        id: patientId || undefined,
        name: "", // Will be filled from profile later
        dob: "",
        email: body.guestEmail || "",
        isGuest,
      },
      requestId: "", // Will be filled after insert
      requestedAt: new Date().toISOString(),
      medication,
      clinicalData: {
        indication: answers.indication || "",
        currentDose: answers.currentDose || "",
        lastPrescribed: answers.lastPrescribedTimeframe || "",
        stabilityDuration: answers.stabilityDuration || "",
        prescribingDoctor: answers.prescribingDoctor || "",
      },
      safetyScreening: {
        sideEffects: answers.sideEffects || "none",
        sideEffectsDetails: answers.sideEffectsDetails,
        pregnantOrBreastfeeding: answers.pregnantOrBreastfeeding || false,
        allergies: answers.allergies || [],
        allergyDetails: answers.allergyDetails,
      },
      medicalHistory: {
        flags: Object.entries(answers.pmhxFlags || {})
          .filter(([, v]) => v === true)
          .map(([k]) => k),
        otherMedications: answers.otherMedications || [],
      },
      eligibility: eligibilityResult,
      attestations: {
        emergencyDisclaimer: {
          accepted: true,
          timestamp: consentTimestamps.emergencyDisclaimer,
        },
        gpAttestation: {
          accepted: true,
          timestamp: consentTimestamps.gpAttestation,
        },
      },
      suggestedDecision,
    }
    
    // Use service client for database writes (bypasses RLS for guests)
    const serviceClient = createServiceClient()
    
    // Create the request
    const { data: requestData, error: requestError } = await serviceClient
      .from("repeat_rx_requests")
      .insert({
        patient_id: patientId,
        is_guest: isGuest,
        guest_email: isGuest ? body.guestEmail : null,
        medication_code: medication.amt_code,
        medication_display: medication.display,
        medication_strength: medication.strength,
        medication_form: medication.form,
        status: eligibilityResult.passed ? "pending" : "requires_consult",
        eligibility_passed: eligibilityResult.passed,
        eligibility_result: eligibilityResult,
        clinical_summary: clinicalSummary,
        emergency_consent_at: consentTimestamps.emergencyDisclaimer,
        gp_attestation_at: consentTimestamps.gpAttestation,
        terms_consent_at: consentTimestamps.terms,
        pharmacy_name: pharmacyDetails?.name,
        pharmacy_address: pharmacyDetails?.address,
        pharmacy_phone: pharmacyDetails?.phone,
        submission_ip: ipAddress,
        submission_user_agent: userAgent,
      })
      .select("id")
      .single()
    
    if (requestError) {
      throw new Error(`Failed to create request: ${requestError.message}`)
    }
    
    const requestId = requestData.id
    
    // Store immutable answers
    await serviceClient.from("repeat_rx_answers").insert({
      request_id: requestId,
      patient_id: patientId,
      version: 1,
      answers: answers,
    })
    
    // Log audit event
    await serviceClient.from("audit_events").insert({
      request_id: requestId,
      patient_id: patientId,
      event_type: "request_submitted",
      payload: {
        medication_code: medication.amt_code,
        medication_name: medication.display,
        is_guest: isGuest,
        eligibility_passed: eligibilityResult.passed,
        red_flag_count: eligibilityResult.redFlags.length,
      },
      ip_address: ipAddress,
      user_agent: userAgent,
    })
    
    return NextResponse.json({
      success: true,
      requestId,
      status: eligibilityResult.passed ? "pending" : "requires_consult",
      message: eligibilityResult.passed
        ? "Your request has been submitted and is awaiting review."
        : "Your request has been submitted. A doctor will review it and may contact you.",
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { error: "Failed to submit request", details: message },
      { status: 500 }
    )
  }
}
