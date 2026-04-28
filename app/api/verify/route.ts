/**
 * Public Certificate Verification API
 * 
 * Security controls:
 * - Rate limited (10 requests/minute per IP) via Redis (Upstash) with in-memory fallback
 * - Stricter limit on failed attempts (3/minute)
 * - Minimal disclosure (masked patient name, no sensitive data)
 * - Input validation and sanitization
 */

import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"
import { NextResponse } from "next/server"

import { logCertificateEvent } from "@/lib/data/issued-certificates"
import { createLogger } from "@/lib/observability/logger"
import { getClientIdentifier } from "@/lib/rate-limit/redis"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { normalizeVerificationCode } from "@/lib/utils/code-normalization"

// ---- Inline rate limit types & helpers (self-contained for this public endpoint) ----

interface RateLimitConfig {
  maxRequests: number
  windowMs: number
}

interface RateLimitResult {
  allowed: boolean
  success: boolean
  remaining: number
  resetAt: number
  retryAfterMs?: number
}

const RATE_LIMITS = {
  verification: { maxRequests: 10, windowMs: 60 * 1000 },
  verificationStrict: { maxRequests: 3, windowMs: 60 * 1000 },
} as const

const memoryStore = new Map<string, { count: number; resetAt: number }>()

function checkMemoryRateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now()
  const entry = memoryStore.get(key)
  if (!entry || entry.resetAt < now) {
    const resetAt = now + config.windowMs
    memoryStore.set(key, { count: 1, resetAt })
    return { allowed: true, success: true, remaining: config.maxRequests - 1, resetAt }
  }
  entry.count++
  if (entry.count > config.maxRequests) {
    return { allowed: false, success: false, remaining: 0, resetAt: entry.resetAt, retryAfterMs: entry.resetAt - now }
  }
  return { allowed: true, success: true, remaining: config.maxRequests - entry.count, resetAt: entry.resetAt }
}

function createRateLimitHeaders(result: RateLimitResult): HeadersInit {
  return {
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
    ...(result.retryAfterMs && { "Retry-After": String(Math.ceil(result.retryAfterMs / 1000)) }),
  }
}

const logger = createLogger("verify-api")

const ISSUED_CERT_SELECT_FIELDS = `
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
  clinic_identity_snapshot,
  certificate_ref
` as const

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
  const clientIp = getClientIdentifier(request)

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
  const code = normalizeVerificationCode(rawCode)

  // Validate code format - allow various formats
  // MC-YYYY-XXXXXXXX (certificate number), IM-TYPE-YYYYMMDD-NNNNN (certificate ref), or XXXXXXXX (verification code)
  const isValidFormat =
    /^MC-\d{4}-[A-F0-9]{8}$/.test(code) ||       // MC-2026-A1B2C3D4 (certificate number)
    /^IM-(WORK|STUDY|CARER)-\d{8}-\d{8}$/.test(code) || // IM-WORK-20260101-04827391 (certificate ref)
    /^[A-Z0-9]{6,16}$/.test(code)                 // Plain verification code or legacy
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
      .select(ISSUED_CERT_SELECT_FIELDS)
      .eq("verification_code", code)
      .maybeSingle()
    
    if (certByVerificationCode) {
      issuedCert = certByVerificationCode
    } else {
      // Try certificate_number if not found by verification_code
      const { data: certByCertNumber } = await supabase
        .from("issued_certificates")
        .select(ISSUED_CERT_SELECT_FIELDS)
        .eq("certificate_number", code)
        .maybeSingle()

      if (certByCertNumber) {
        issuedCert = certByCertNumber
      } else {
        // Try certificate_ref (e.g. IM-WORK-20260218-04827)
        const { data: certByRef } = await supabase
          .from("issued_certificates")
          .select(ISSUED_CERT_SELECT_FIELDS)
          .eq("certificate_ref", code)
          .maybeSingle()

        issuedCert = certByRef
      }
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
      
      // Superseded means a replacement certificate exists - don't confirm authenticity
      // of the outdated record; verifier should request the current one.
      if (issuedCert.status === "superseded") {
        await checkRateLimit(`verify-fail:${clientIp}`, RATE_LIMITS.verificationStrict, true)
        return NextResponse.json(
          {
            valid: false,
            status: "superseded",
            message: "This certificate has been replaced by an updated version. Please request the current certificate from the patient.",
          },
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
interface VerificationResult {
  valid: boolean
  certificate: {
    certificateNumber: string | null
    type: string
    issueDate: string | undefined
    validFrom?: string | null
    validTo?: string | null
    patientName: string
    issuingDoctor: string
    issuingClinic: string
  }
}

async function checkLegacyTables(
  supabase: ReturnType<typeof createServiceRoleClient>,
  code: string
): Promise<VerificationResult | null> {
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
        issuingDoctor: formatDoctorName(legacyCert.doctor_name, null),
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
    // Nested FK join: intake_documents -> intakes -> profiles. Supabase returns
    // untyped nested objects for multi-level joins, so we define the expected shape.
    interface IntakeJoin {
      patient: { full_name: string }[] | { full_name: string } | null
      reviewed_by: string | null
      category: string | null
      service?: { slug?: string } | null
    }
    const intake = (Array.isArray(intakeDoc.intake) ? intakeDoc.intake[0] : intakeDoc.intake) as IntakeJoin | null

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
        doctorName = formatDoctorName(doctor.full_name, null)
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
 * Format doctor name as "Dr. {Name}, {Nominals}".
 * Idempotent — adding "Dr." to a name that already starts with "Dr." is skipped.
 */
function formatDoctorName(name: string | null, nominals: string | null): string {
  if (!name) return "InstantMed Doctor"
  const trimmed = name.trim()
  const withTitle = /^dr\.?\s/i.test(trimmed) ? trimmed : `Dr. ${trimmed}`
  if (!nominals) return withTitle
  return `${withTitle}, ${nominals}`
}
