import "server-only"
import { createClient } from "@supabase/supabase-js"

function getServiceClient() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error("Missing Supabase credentials")
  return createClient(url, key)
}

export type FraudFlag = {
  type: "multiple_daily" | "suspicious_medicare" | "rapid_completion" | "duplicate_request"
  severity: "low" | "medium" | "high"
  details: Record<string, unknown>
}

export type FraudCheckResult = {
  flagged: boolean
  flags: FraudFlag[]
  riskScore: number // 0-100
}

/**
 * Check for multiple requests in same day
 */
async function checkMultipleDaily(patientId: string): Promise<FraudFlag | null> {
  const supabase = getServiceClient()
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const { count } = await supabase
    .from("requests")
    .select("*", { count: "exact", head: true })
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
 */
function checkSuspiciousMedicare(medicareNumber: string): FraudFlag | null {
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
 */
function checkRapidCompletion(startTime: Date, endTime: Date): FraudFlag | null {
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
 * Check for duplicate requests
 */
async function checkDuplicateRequest(patientId: string, category: string, subtype: string): Promise<FraudFlag | null> {
  const supabase = getServiceClient()
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)

  const { data } = await supabase
    .from("requests")
    .select("id")
    .eq("patient_id", patientId)
    .eq("category", category)
    .eq("subtype", subtype)
    .gte("created_at", oneHourAgo.toISOString())
    .limit(1)
    .single()

  if (data) {
    return {
      type: "duplicate_request",
      severity: "medium",
      details: { existingRequestId: data.id, category, subtype },
    }
  }

  return null
}

/**
 * Run all fraud checks
 */
export async function runFraudChecks(params: {
  patientId: string
  medicareNumber?: string
  category: string
  subtype: string
  formStartTime?: Date
  formEndTime?: Date
}): Promise<FraudCheckResult> {
  const flags: FraudFlag[] = []

  // Check multiple daily
  const multipleDaily = await checkMultipleDaily(params.patientId)
  if (multipleDaily) flags.push(multipleDaily)

  // Check Medicare
  if (params.medicareNumber) {
    const suspiciousMedicare = checkSuspiciousMedicare(params.medicareNumber)
    if (suspiciousMedicare) flags.push(suspiciousMedicare)
  }

  // Check rapid completion
  if (params.formStartTime && params.formEndTime) {
    const rapidCompletion = checkRapidCompletion(params.formStartTime, params.formEndTime)
    if (rapidCompletion) flags.push(rapidCompletion)
  }

  // Check duplicate
  const duplicate = await checkDuplicateRequest(params.patientId, params.category, params.subtype)
  if (duplicate) flags.push(duplicate)

  // Calculate risk score
  let riskScore = 0
  for (const flag of flags) {
    if (flag.severity === "high") riskScore += 40
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
export async function saveFraudFlags(requestId: string, patientId: string, flags: FraudFlag[]): Promise<void> {
  if (flags.length === 0) return

  const supabase = getServiceClient()

  const inserts = flags.map((flag) => ({
    request_id: requestId,
    patient_id: patientId,
    flag_type: flag.type,
    severity: flag.severity,
    details: flag.details,
  }))

  await supabase.from("fraud_flags").insert(inserts)
}
