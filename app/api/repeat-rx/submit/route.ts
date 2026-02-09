import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { checkEligibility, generateSuggestedDecision } from "@/lib/repeat-rx/rules-engine"
import { rateLimit } from "@/lib/rate-limit/limiter"
import { createLogger } from "@/lib/observability/logger"
import { z } from "zod"
const log = createLogger("route")
import type {
  ClinicalSummary,
  RepeatRxSubmitPayload,
} from "@/types/repeat-rx"

// Zod schema for request validation
const medicationSchema = z.object({
  amt_code: z.string().min(1, "Medication code is required"),
  display: z.string(),
  medication_name: z.string(),
  strength: z.string(),
  form: z.string(),
})

const consentTimestampsSchema = z.object({
  emergencyDisclaimer: z.string().min(1, "Emergency disclaimer consent required"),
  gpAttestation: z.string().min(1, "GP attestation consent required"),
  terms: z.string().optional(),
})

const pharmacyDetailsSchema = z.object({
  name: z.string(),
  address: z.string(),
  phone: z.string(),
}).optional()

const repeatRxSubmitSchema = z.object({
  medication: medicationSchema,
  answers: z.record(z.string(), z.unknown()),
  consentTimestamps: consentTimestampsSchema,
  pharmacyDetails: pharmacyDetailsSchema,
  guestEmail: z.string().email().optional(),
})

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
    
    // Get user session
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
    
    // Parse and validate request body with Zod
    const rawBody = await request.json()
    const parseResult = repeatRxSubmitSchema.safeParse(rawBody)
    
    if (!parseResult.success) {
      log.warn("[Repeat Rx Submit] Validation failed", { 
        errors: parseResult.error.flatten().fieldErrors 
      })
      return NextResponse.json(
        { error: "Invalid request", details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      )
    }
    
    const { medication, answers, consentTimestamps, pharmacyDetails, guestEmail } = parseResult.data as RepeatRxSubmitPayload
    
    const supabase = createServiceRoleClient()
    
    let patientId: string | null = null
    let isGuest = true
    
    if (userId) {
      // Get patient profile using auth user ID
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
        email: guestEmail || "",
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
    const serviceClient = createServiceRoleClient()
    
    // Create the request
    const { data: requestData, error: requestError } = await serviceClient
      .from("repeat_rx_requests")
      .insert({
        patient_id: patientId,
        is_guest: isGuest,
        guest_email: isGuest ? guestEmail : null,
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
    log.error("Failed to submit repeat rx", {
      error: error instanceof Error ? error.message : "Unknown error",
    })
    return NextResponse.json(
      { error: "Failed to submit request" },
      { status: 500 }
    )
  }
}
