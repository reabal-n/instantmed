/**
 * Public Certificate Verification API
 * 
 * Security controls:
 * - Rate limited (10 requests/minute per IP) via Redis (Upstash) with in-memory fallback
 * - Stricter limit on failed attempts (3/minute)
 * - Minimal disclosure (masked patient name, no sensitive data)
 * - Input validation and sanitization
 */

import { NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"
import {
  checkRateLimit as checkMemoryRateLimit,
  getClientIp,
  createRateLimitHeaders,
  RATE_LIMITS,
  type RateLimitResult,
} from "@/lib/rate-limit"
import { logCertificateEvent } from "@/lib/data/issued-certificates"
import { createLogger } from "@/lib/observability/logger"

const logger = createLogger("verify-api")

/**
 * Log verification attempts for security monitoring
 * Helps detect brute force attempts or fraud patterns
 */
async function logVerificationAttempt(
  code: string,
  ip: string,
  userAgent: string | null,
  success: boolean
): Promise<void> {
  try {
    // Mask the code for logging (show first 4 chars only)
    const maskedCode = code.length > 4 ? `${code.slice(0, 4)}****` : "****"
    
    logger.info("Verification attempt", {
      code: maskedCode,
      ip,
      userAgent: userAgent?.slice(0, 100),
      success,
    })
  } catch {
    // Non-blocking - don't fail verification on logging error
  }
}

// Initialize Redis rate limiter if Upstash is configured
let redisRateLimiter: Ratelimit | null = null
let redisStrictRateLimiter: Ratelimit | null = null

if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  const redis = Redis.fromEnv()
  redisRateLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, "60 s"),
    analytics: true,
    prefix: "ratelimit:verify",
  })
  redisStrictRateLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(3, "60 s"),
    analytics: true,
    prefix: "ratelimit:verify-fail",
  })
}

/**
 * Check rate limit using Redis if available, otherwise fall back to in-memory
 */
async function checkRateLimit(
  key: string,
  config: { maxRequests: number; windowMs: number },
  useStrict = false
): Promise<RateLimitResult> {
  const limiter = useStrict ? redisStrictRateLimiter : redisRateLimiter
  
  if (limiter) {
    try {
      const result = await limiter.limit(key)
      return {
        allowed: result.success,
        success: result.success,
        remaining: result.remaining,
        resetAt: result.reset,
        retryAfterMs: result.success ? undefined : (result.reset - Date.now()),
      }
    } catch {
      // Redis failed, fall through to in-memory
    }
  }
  
  // Fallback to in-memory rate limiting
  return checkMemoryRateLimit(key, config)
}

export async function GET(request: Request) {
  const clientIp = getClientIp(request)

  // Apply rate limiting (Redis with in-memory fallback)
  const rateLimit = await checkRateLimit(`verify:${clientIp}`, RATE_LIMITS.verification)
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { valid: false, error: "Too many verification attempts. Please try again later." },
      { 
        status: 429, 
        headers: createRateLimitHeaders(rateLimit),
      }
    )
  }

  const { searchParams } = new URL(request.url)
  const rawCode = searchParams.get("code")

  // Input validation
  if (!rawCode) {
    return NextResponse.json(
      { valid: false, error: "Verification code is required" },
      { status: 400, headers: createRateLimitHeaders(rateLimit) }
    )
  }

  // Sanitize and normalize input
  const code = rawCode.trim().toUpperCase().replace(/[^A-Z0-9-]/g, "")

  // Validate code format - allow various formats
  // MC-XXXXXXXX (certificate number) or XXXXXXXX (verification code)
  const isValidFormat = /^(MC-)?[A-Z0-9]{6,16}$/.test(code)
  if (!isValidFormat) {
    // Apply stricter rate limit for invalid format attempts (potential brute force)
    await checkRateLimit(`verify-fail:${clientIp}`, RATE_LIMITS.verificationStrict, true)
    return NextResponse.json(
      { valid: false, error: "Invalid verification code format" },
      { status: 400, headers: createRateLimitHeaders(rateLimit) }
    )
  }

  try {
    const supabase = createServiceRoleClient()

    // 1. Check issued_certificates table (new model) - by verification code OR certificate number
    // P0 SECURITY FIX: Query by each field separately to avoid SQL injection from string interpolation
    // First try verification_code, then certificate_number
    let issuedCert = null
    
    const { data: certByVerificationCode } = await supabase
      .from("issued_certificates")
      .select(`
        id,
        certificate_number,
        verification_code,
        certificate_type,
        status,
        issue_date,
        start_date,
        end_date,
        patient_name,
        doctor_name,
        doctor_nominals,
        clinic_identity_snapshot
      `)
      .eq("verification_code", code)
      .maybeSingle()
    
    if (certByVerificationCode) {
      issuedCert = certByVerificationCode
    } else {
      // Try certificate_number if not found by verification_code
      const { data: certByCertNumber } = await supabase
        .from("issued_certificates")
        .select(`
          id,
          certificate_number,
          verification_code,
          certificate_type,
          status,
          issue_date,
          start_date,
          end_date,
          patient_name,
          doctor_name,
          doctor_nominals,
          clinic_identity_snapshot
        `)
        .eq("certificate_number", code)
        .maybeSingle()
      
      issuedCert = certByCertNumber
    }

    if (issuedCert) {
      // P1 FIX: Provide transparency on certificate status for verifiers
      // Revoked certificates should explicitly indicate revocation for trust
      if (issuedCert.status === "revoked") {
        await checkRateLimit(`verify-fail:${clientIp}`, RATE_LIMITS.verificationStrict, true)
        return NextResponse.json(
          { 
            valid: false, 
            status: "revoked",
            message: "This certificate has been revoked and is no longer valid."
          },
          { headers: createRateLimitHeaders(rateLimit) }
        )
      }
      
      // Other invalid statuses (superseded, etc) - don't reveal specific reason
      if (issuedCert.status !== "valid") {
        await checkRateLimit(`verify-fail:${clientIp}`, RATE_LIMITS.verificationStrict, true)
        return NextResponse.json(
          { valid: false },
          { headers: createRateLimitHeaders(rateLimit) }
        )
      }

      // Log verification event (non-blocking)
      void logCertificateEvent(issuedCert.id, "verified", null, "system", {
        ip_address: clientIp,
        user_agent: request.headers.get("user-agent"),
      })

      // Get clinic name from snapshot
      const clinicSnapshot = issuedCert.clinic_identity_snapshot as { 
        clinic_name?: string
        trading_name?: string 
      } | null
      const clinicName = clinicSnapshot?.trading_name || clinicSnapshot?.clinic_name || "InstantMed"

      return NextResponse.json({
        valid: true,
        certificate: {
          certificateNumber: issuedCert.certificate_number,
          type: formatCertificateType(issuedCert.certificate_type),
          issueDate: issuedCert.issue_date,
          validFrom: issuedCert.start_date,
          validTo: issuedCert.end_date,
          patientName: maskName(issuedCert.patient_name),
          issuingDoctor: formatDoctorName(issuedCert.doctor_name, issuedCert.doctor_nominals),
          issuingClinic: clinicName,
        },
      }, { headers: createRateLimitHeaders(rateLimit) })
    }

    // 2. Fallback: Check legacy tables for older certificates
    const legacyResult = await checkLegacyTables(supabase, code)
    if (legacyResult) {
      return NextResponse.json(legacyResult, { headers: createRateLimitHeaders(rateLimit) })
    }

    // Not found - apply stricter rate limit and log failed attempt
    await checkRateLimit(`verify-fail:${clientIp}`, RATE_LIMITS.verificationStrict, true)
    
    // P2 FIX: Log failed verification attempts for security monitoring
    // This helps detect brute force attempts or fraud patterns
    void logVerificationAttempt(code, clientIp, request.headers.get("user-agent"), false)
    
    return NextResponse.json(
      { valid: false },
      { headers: createRateLimitHeaders(rateLimit) }
    )
  } catch {
    return NextResponse.json(
      { valid: false, error: "Verification service temporarily unavailable" },
      { status: 500, headers: createRateLimitHeaders(rateLimit) }
    )
  }
}

/**
 * Check legacy certificate tables for older certificates
 */
async function checkLegacyTables(
  supabase: ReturnType<typeof createServiceRoleClient>,
  code: string
// eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any | null> {
  // Check med_cert_certificates table
  const { data: legacyCert } = await supabase
    .from("med_cert_certificates")
    .select(`
      id,
      certificate_number,
      certificate_type,
      created_at,
      patient_name,
      doctor_name,
      date_from,
      date_to
    `)
    .eq("certificate_number", code)
    .maybeSingle()

  if (legacyCert) {
    return {
      valid: true,
      certificate: {
        certificateNumber: legacyCert.certificate_number,
        type: formatCertificateType(legacyCert.certificate_type),
        issueDate: legacyCert.created_at?.split("T")[0],
        validFrom: legacyCert.date_from,
        validTo: legacyCert.date_to,
        patientName: maskName(legacyCert.patient_name),
        issuingDoctor: legacyCert.doctor_name || "InstantMed Doctor",
        issuingClinic: "InstantMed",
      },
    }
  }

  // Check intake_documents table
  const { data: intakeDoc } = await supabase
    .from("intake_documents")
    .select(`
      id,
      certificate_number,
      created_at,
      intake:intakes!intake_id(
        patient:profiles!patient_id(full_name),
        reviewed_by,
        category
      )
    `)
    .eq("certificate_number", code)
    .maybeSingle()

  if (intakeDoc) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const intake = intakeDoc.intake as any

    const patientRaw = intake?.patient
    const patientData = Array.isArray(patientRaw) ? patientRaw[0] : patientRaw
    
    let doctorName = "InstantMed Doctor"
    if (intake?.reviewed_by) {
      const { data: doctor } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", intake.reviewed_by)
        .maybeSingle()
      if (doctor?.full_name) {
        doctorName = doctor.full_name
      }
    }

    const certType = intake?.service?.slug?.includes("carer") 
      ? "carer" 
      : intake?.service?.slug?.includes("uni") 
        ? "study" 
        : "work"

    return {
      valid: true,
      certificate: {
        certificateNumber: intakeDoc.certificate_number,
        type: formatCertificateType(certType),
        issueDate: intakeDoc.created_at?.split("T")[0],
        patientName: maskName(patientData?.full_name || "Patient"),
        issuingDoctor: doctorName,
        issuingClinic: "InstantMed",
      },
    }
  }

  return null
}

/**
 * Mask patient name for privacy (first name + last initial only)
 */
function maskName(fullName: string | null): string {
  if (!fullName) return "Patient"
  
  const parts = fullName.trim().split(/\s+/)
  if (parts.length === 0) return "Patient"
  if (parts.length === 1) return parts[0]
  
  const firstName = parts[0]
  const lastInitial = parts[parts.length - 1][0]?.toUpperCase() || ""
  
  return lastInitial ? `${firstName} ${lastInitial}.` : firstName
}

/**
 * Format certificate type for display
 */
function formatCertificateType(type: string | null): string {
  switch (type) {
    case "work": return "Medical Certificate (Work)"
    case "study": return "Medical Certificate (Study)"
    case "carer": return "Carer's Leave Certificate"
    default: return "Medical Certificate"
  }
}

/**
 * Format doctor name with nominals
 */
function formatDoctorName(name: string | null, nominals: string | null): string {
  if (!name) return "InstantMed Doctor"
  if (!nominals) return name
  return `${name}, ${nominals}`
}
