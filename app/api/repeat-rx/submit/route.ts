import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/server"
import { checkEligibility, generateSuggestedDecision } from "@/lib/repeat-rx/rules-engine"
import { auth } from "@clerk/nextjs/server"
import { rateLimit } from "@/lib/rate-limit/limiter"
import { createLogger } from "@/lib/observability/logger"
const log = createLogger("route")
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
    // Get client IP for rate limiting
    const ipAddress = request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown"
    const userAgent = request.headers.get("user-agent") || "unknown"
    
    // Get user session via Clerk
    const { userId } = await auth()
    
    // Apply rate limiting (use userId if authenticated, IP otherwise)
    const rateLimitKey = userId || `ip:${ipAddress}`
    const rateLimitResult = await rateLimit(rateLimitKey, '/api/repeat-rx/submit')
    if (!rateLimitResult.allowed) {
      log.warn("[Repeat Rx Submit] Rate limit exceeded", { rateLimitKey })
      return NextResponse.json(
        { error: "Too many requests. Please wait a few minutes before trying again." },
        { status: 429, headers: { 'Retry-After': '300' } }
      )
    }
    
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
    
    const supabase = await createClient()
    
    let patientId: string | null = null
    let isGuest = true
    
    if (userId) {
      // Get patient profile using Clerk user ID
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("clerk_user_id", userId)
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
