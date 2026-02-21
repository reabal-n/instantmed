import "server-only"
import { createClient } from "@supabase/supabase-js"

function getServiceClient() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error("Missing Supabase credentials")
  return createClient(url, key)
}

// ADVERSARIAL_SECURITY_AUDIT: Expanded fraud flag types
export type FraudFlag = {
  type: 
    | "multiple_daily" 
    | "suspicious_medicare" 
    | "rapid_completion" 
    | "duplicate_request"
    | "duplicate_medication"      // Critical #3: Multi-account medication stacking
    | "rolling_window_abuse"      // High #5: Certificate duration creep
    | "chat_restart_abuse"        // High: Multiple chat restarts
    | "injection_attempt"         // Medium: Prompt injection attempt
    | "soft_flag"                 // Medium: Below threshold but noteworthy
  severity: "low" | "medium" | "high" | "critical"
  details: Record<string, unknown>
}

export type FraudCheckResult = {
  flagged: boolean
  flags: FraudFlag[]
  riskScore: number // 0-100
}

/**
 * Check for multiple intakes in same day
 */
async function checkMultipleDaily(patientId: string): Promise<FraudFlag | null> {
  const supabase = getServiceClient()
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const { count } = await supabase
    .from("intakes")
    .select("id", { count: "exact", head: true })
    .eq("patient_id", patientId)
    .gte("created_at", today.toISOString())

  if (count && count >= 3) {
    return {
      type: "multiple_daily",
      severity: count >= 5 ? "high" : "medium",
      details: { count, date: today.toISOString() },
    }
  }

  return null
}

/**
 * Check for suspicious Medicare patterns
 * @internal Exported for testing
 */
export function checkSuspiciousMedicare(medicareNumber: string): FraudFlag | null {
  // Check for obviously fake patterns
  const suspicious = [
    /^(\d)\1{9}$/, // All same digit
    /^1234567890$/, // Sequential
    /^0987654321$/, // Reverse sequential
    /^0{10}$/, // All zeros
  ]

  for (const pattern of suspicious) {
    if (pattern.test(medicareNumber)) {
      return {
        type: "suspicious_medicare",
        severity: "high",
        details: { pattern: pattern.toString(), value: medicareNumber },
      }
    }
  }

  return null
}

/**
 * Check for rapid form completion (bot detection)
 * @internal Exported for testing
 */
export function checkRapidCompletion(startTime: Date, endTime: Date): FraudFlag | null {
  const durationMs = endTime.getTime() - startTime.getTime()
  const durationSeconds = durationMs / 1000

  // Less than 30 seconds is suspicious
  if (durationSeconds < 30) {
    return {
      type: "rapid_completion",
      severity: durationSeconds < 10 ? "high" : "medium",
      details: { durationSeconds, startTime: startTime.toISOString(), endTime: endTime.toISOString() },
    }
  }

  return null
}

/**
 * Check for duplicate intakes
 */
async function checkDuplicateRequest(patientId: string, category: string, subtype: string): Promise<FraudFlag | null> {
  const supabase = getServiceClient()
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)

  const { data } = await supabase
    .from("intakes")
    .select("id")
    .eq("patient_id", patientId)
    .eq("category", category)
    .eq("subtype", subtype)
    .gte("created_at", oneHourAgo.toISOString())
    .limit(1)
    .maybeSingle()

  if (data) {
    return {
      type: "duplicate_request",
      severity: "medium",
      details: { existingIntakeId: data.id, category, subtype },
    }
  }

  return null
}

// ============================================================================
// ADVERSARIAL_SECURITY_AUDIT: NEW FRAUD DETECTION FUNCTIONS
// ============================================================================

/**
 * CRITICAL #3: Medicare number deduplication for repeat prescriptions
 * Prevents multi-account medication stacking
 */
export async function checkMedicareDuplication(
  medicareNumber: string,
  medicationCode: string,
  excludePatientId?: string
): Promise<FraudFlag | null> {
  const supabase = getServiceClient()
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  // Step 1: Find all patient profiles with the same Medicare number
  // (different accounts may share a Medicare number in stacking attacks)
  const { data: matchingProfiles } = await supabase
    .from("profiles")
    .select("id")
    .eq("medicare_number", medicareNumber)

  if (!matchingProfiles || matchingProfiles.length === 0) return null

  const patientIds = matchingProfiles
    .map((p) => p.id as string)
    .filter((id) => id !== excludePatientId)

  if (patientIds.length === 0) return null

  // Step 2: Check for active repeat_rx_requests for the same medication
  // from any of those profiles in the last 30 days
  const { data: existingRequests } = await supabase
    .from("repeat_rx_requests")
    .select("id, patient_id, status, created_at")
    .in("patient_id", patientIds)
    .eq("medication_code", medicationCode)
    .in("status", ["pending", "approved"])
    .gte("created_at", thirtyDaysAgo.toISOString())

  if (existingRequests && existingRequests.length > 0) {
    return {
      type: "duplicate_medication",
      severity: "critical",
      details: {
        medicationCode,
        matchingRequestCount: existingRequests.length,
        matchingPatientIds: existingRequests.map((r) => r.patient_id),
        existingRequestIds: existingRequests.map((r) => r.id),
        reason: "Same Medicare number used across accounts for the same medication",
      },
    }
  }

  return null
}

/**
 * HIGH #5: Rolling window check for medical certificate abuse
 * Detects certificate duration creep (multiple short certs instead of one long one)
 */
export async function checkRollingWindowCertificates(
  patientId: string
): Promise<FraudFlag | null> {
  const supabase = getServiceClient()
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)

  const { data } = await supabase
    .from("intakes")
    .select("id, created_at, intake_answers:intake_answers(answers)")
    .eq("patient_id", patientId)
    .eq("category", "medical_certificate")
    .gte("created_at", fourteenDaysAgo.toISOString())
    .in("status", ["pending", "approved", "completed"])

  if (!data || data.length < 2) return null

  // Calculate total certificate days
  const totalDays = data.reduce((sum, r) => {
    const intakeAnswers = Array.isArray(r.intake_answers) ? r.intake_answers[0] : r.intake_answers
    const answers = (intakeAnswers?.answers as Record<string, unknown>) || null
    const duration = answers?.duration as number | string | undefined
    return sum + (typeof duration === "number" ? duration : parseInt(String(duration) || "0", 10))
  }, 0)

  if (data.length >= 2) {
    return {
      type: "rolling_window_abuse",
      severity: totalDays > 5 ? "high" : "medium",
      details: {
        certificateCount: data.length,
        totalDays,
        period: "14_days",
        requestIds: data.map(r => r.id),
      },
    }
  }

  return null
}

/**
 * HIGH: Track chat restarts for fraud detection
 * Users who abandon and restart may be testing what triggers flags
 */
export async function checkChatRestarts(
  patientId: string,
  _sessionId: string
): Promise<FraudFlag | null> {
  const supabase = getServiceClient()
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)

  // Count abandoned sessions in the last hour
  const { count } = await supabase
    .from("chat_sessions")
    .select("id", { count: "exact", head: true })
    .eq("patient_id", patientId)
    .eq("status", "abandoned")
    .gte("abandoned_at", oneHourAgo.toISOString())

  if (count && count >= 3) {
    return {
      type: "chat_restart_abuse",
      severity: count >= 5 ? "high" : "medium",
      details: {
        abandonedCount: count,
        period: "1_hour",
        reason: "Multiple abandoned chat sessions may indicate flag-testing behavior",
      },
    }
  }

  return null
}

/**
 * MEDIUM: Lower thresholds with soft flags
 * Catches patterns below hard thresholds for cumulative risk scoring
 */
export async function checkSoftFlags(
  patientId: string,
  category: string
): Promise<FraudFlag | null> {
  const supabase = getServiceClient()
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Check for 2 intakes today (below hard threshold of 3)
  const { count } = await supabase
    .from("intakes")
    .select("id", { count: "exact", head: true })
    .eq("patient_id", patientId)
    .gte("created_at", today.toISOString())

  if (count && count === 2) {
    return {
      type: "soft_flag",
      severity: "low",
      details: {
        reason: "approaching_daily_limit",
        currentCount: count,
        threshold: 3,
        category,
      },
    }
  }

  return null
}

/**
 * Log injection attempt for security monitoring
 */
export async function logInjectionAttempt(
  patientId: string,
  inputText: string,
  detectedPattern: string
): Promise<void> {
  const supabase = getServiceClient()

  await supabase.from("security_events").insert({
    event_type: "injection_attempt",
    patient_id: patientId,
    details: {
      inputText: inputText.substring(0, 500), // Truncate for safety
      detectedPattern,
      timestamp: new Date().toISOString(),
    },
    severity: "medium",
  })

  // Check if user should be flagged for multiple attempts
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
  const { count } = await supabase
    .from("security_events")
    .select("id", { count: "exact", head: true })
    .eq("patient_id", patientId)
    .eq("event_type", "injection_attempt")
    .gte("created_at", oneHourAgo.toISOString())

  // Flag account after 2+ injection attempts
  if (count && count >= 2) {
    await supabase.from("patient_flags").upsert({
      patient_id: patientId,
      flag_type: "security_concern",
      reason: "multiple_injection_attempts",
      details: { attemptCount: count },
      created_at: new Date().toISOString(),
    }, { onConflict: "patient_id,flag_type" })
  }
}

/**
 * Run all fraud checks
 * ADVERSARIAL_SECURITY_AUDIT: Enhanced with new detection capabilities
 */
export async function runFraudChecks(params: {
  patientId: string
  medicareNumber?: string
  medicationCode?: string
  category: string
  subtype: string
  formStartTime?: Date
  formEndTime?: Date
  chatSessionId?: string
}): Promise<FraudCheckResult> {
  const flags: FraudFlag[] = []

  // Check multiple daily
  const multipleDaily = await checkMultipleDaily(params.patientId)
  if (multipleDaily) flags.push(multipleDaily)

  // Check Medicare format
  if (params.medicareNumber) {
    const suspiciousMedicare = checkSuspiciousMedicare(params.medicareNumber)
    if (suspiciousMedicare) flags.push(suspiciousMedicare)
  }

  // CRITICAL #3: Medicare deduplication for repeat prescriptions
  if (params.medicareNumber && params.medicationCode) {
    const medicareDupe = await checkMedicareDuplication(
      params.medicareNumber,
      params.medicationCode,
      params.patientId
    )
    if (medicareDupe) flags.push(medicareDupe)
  }

  // Check rapid completion
  if (params.formStartTime && params.formEndTime) {
    const rapidCompletion = checkRapidCompletion(params.formStartTime, params.formEndTime)
    if (rapidCompletion) flags.push(rapidCompletion)
  }

  // Check duplicate request
  const duplicate = await checkDuplicateRequest(params.patientId, params.category, params.subtype)
  if (duplicate) flags.push(duplicate)

  // HIGH #5: Rolling window check for med certs
  if (params.category === "medical_certificate") {
    const rollingWindow = await checkRollingWindowCertificates(params.patientId)
    if (rollingWindow) flags.push(rollingWindow)
  }

  // HIGH: Chat restart abuse detection
  if (params.chatSessionId) {
    const chatRestarts = await checkChatRestarts(params.patientId, params.chatSessionId)
    if (chatRestarts) flags.push(chatRestarts)
  }

  // MEDIUM: Soft flags for cumulative risk
  const softFlag = await checkSoftFlags(params.patientId, params.category)
  if (softFlag) flags.push(softFlag)

  // Calculate risk score with updated weights
  let riskScore = 0
  for (const flag of flags) {
    if (flag.severity === "critical") riskScore += 50
    else if (flag.severity === "high") riskScore += 40
    else if (flag.severity === "medium") riskScore += 20
    else riskScore += 10
  }
  riskScore = Math.min(riskScore, 100)

  return {
    flagged: flags.length > 0,
    flags,
    riskScore,
  }
}

/**
 * Save fraud flags to database
 */
export async function saveFraudFlags(intakeId: string, patientId: string, flags: FraudFlag[]): Promise<void> {
  if (flags.length === 0) return

  const supabase = getServiceClient()

  const inserts = flags.map((flag) => ({
    intake_id: intakeId,
    patient_id: patientId,
    flag_type: flag.type,
    severity: flag.severity,
    details: flag.details,
  }))

  await supabase.from("fraud_flags").insert(inserts)
}
