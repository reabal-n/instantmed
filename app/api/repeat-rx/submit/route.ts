import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { rateLimit } from "@/lib/rate-limit/limiter"
import { createLogger } from "@/lib/observability/logger"
import { requireValidCsrf } from "@/lib/security/csrf"
import { z } from "zod"
const log = createLogger("route")

// Zod schema for request validation (simplified for Parchment workflow)
const medicationSchema = z.object({
  amt_code: z.string().optional().default(""),
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
 * Submit a repeat prescription request (simplified Parchment workflow)
 *
 * Creates:
 * - repeat_rx_requests record (status: 'pending')
 * - repeat_rx_answers record (immutable)
 * - audit_events entry
 *
 * Eligibility rules engine removed - doctor reviews all requests directly
 * and sends script via Parchment.
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

    const csrfError = await requireValidCsrf(request)
    if (csrfError) return csrfError

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

    const { medication, answers, consentTimestamps, pharmacyDetails, guestEmail } = parseResult.data

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

    // Use service client for database writes (bypasses RLS for guests)
    const serviceClient = createServiceRoleClient()

    // Create the request - status always starts as 'pending'
    const { data: requestData, error: requestError } = await serviceClient
      .from("repeat_rx_requests")
      .insert({
        patient_id: patientId,
        is_guest: isGuest,
        guest_email: isGuest ? guestEmail : null,
        medication_code: medication.amt_code || "",
        medication_display: medication.display,
        medication_strength: medication.strength,
        medication_form: medication.form,
        status: "pending",
        eligibility_passed: true, // Simplified: no rules engine
        eligibility_result: { passed: true, simplified: true },
        clinical_summary: {
          medication,
          answers,
          patientNotes: answers.patientNotes || answers.reason || "",
        },
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

    const intakeId = requestData.id

    // Store immutable answers
    await serviceClient.from("repeat_rx_answers").insert({
      intake_id: intakeId,
      patient_id: patientId,
      version: 1,
      answers: answers,
    })

    // Log audit event
    await serviceClient.from("audit_events").insert({
      intake_id: intakeId,
      patient_id: patientId,
      event_type: "request_submitted",
      payload: {
        medication_code: medication.amt_code || "",
        medication_name: medication.display,
        is_guest: isGuest,
      },
      ip_address: ipAddress,
      user_agent: userAgent,
    })

    return NextResponse.json({
      success: true,
      intakeId,
      status: "pending",
      message: "Your request has been submitted and is awaiting review.",
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
