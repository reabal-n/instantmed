import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { checkEligibility, generateSuggestedDecision } from "@/lib/repeat-rx/rules-engine"
import { auth } from "@clerk/nextjs/server"
import { rateLimit } from "@/lib/rate-limit/limiter"
import type {
  MedicationSelection,
  RepeatRxIntakeAnswers,
} from "@/types/repeat-rx"

/**
 * POST /api/repeat-rx/eligibility
 * Check eligibility for a repeat prescription request
 * 
 * Returns:
 * - passed: true if eligible for immediate processing
 * - canProceed: true if can proceed to consult (even if not auto-approved)
 * - redFlags: array of issues for clinician review
 * - ruleOutcomes: detailed breakdown of each rule check
 * - suggestedDecision: pre-filled decision for clinician dashboard
 */
export async function POST(request: Request) {
  try {
    // Rate limiting - use IP or userId
    const { userId } = await auth()
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown"
    const rateLimitKey = userId || `ip:${ip}`
    
    const rateLimitResult = await rateLimit(rateLimitKey, '/api/repeat-rx/eligibility')
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      )
    }
    
    const body = await request.json()
    const { medication, answers } = body as {
      medication: MedicationSelection
      answers: Partial<RepeatRxIntakeAnswers>
    }
    
    // Validate required fields
    if (!medication || !medication.amt_code) {
      return NextResponse.json(
        { error: "Medication is required" },
        { status: 400 }
      )
    }
    
    // Run eligibility check
    const result = checkEligibility(medication, answers)
    
    // Log audit event (optional - only if user is authenticated)
    // userId already obtained above for rate limiting
    const supabase = await createClient()
    
    if (userId) {
      // Get patient profile using Clerk user ID
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("clerk_user_id", userId)
        .single()
      
      if (profile?.id) {
        // Log eligibility check to audit_events
        await supabase.from("audit_events").insert({
          patient_id: profile.id,
          event_type: "eligibility_checked",
          payload: {
            medication_code: medication.amt_code,
            medication_name: medication.display,
            passed: result.passed,
            can_proceed: result.canProceed,
            red_flag_count: result.redFlags.length,
            rule_outcomes: result.ruleOutcomes.map(r => ({
              ruleId: r.ruleId,
              passed: r.passed,
              reason: r.reason,
            })),
          },
          ip_address: request.headers.get("x-forwarded-for") || "unknown",
          user_agent: request.headers.get("user-agent") || "unknown",
        })
      }
    }
    
    // Generate suggested decision for clinician (stored but not exposed to patient)
    const _suggestedDecision = generateSuggestedDecision(result)
    
    // Return result to client
    return NextResponse.json(result)
  } catch {
    return NextResponse.json(
      { error: "Failed to check eligibility" },
      { status: 500 }
    )
  }
}
