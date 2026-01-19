import { NextRequest, NextResponse } from "next/server"
import { createLogger } from "@/lib/observability/logger"
import { createClient } from "@/lib/supabase/server"
import { validateIntakePayload, type IntakePayload } from "@/lib/intake/chat-validation"

const log = createLogger("ai-chat-intake-validate")

/**
 * POST /api/ai/chat-intake/validate
 * 
 * Server-side validation for AI-collected intake data.
 * Call this BEFORE allowing submission to ensure data integrity.
 * 
 * CRITICAL: Never trust AI output. Always revalidate.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    const body = await request.json()
    const payload = body as IntakePayload
    
    if (!payload || typeof payload !== 'object') {
      return NextResponse.json(
        { valid: false, errors: ['Invalid request body'] },
        { status: 400 }
      )
    }
    
    const validation = validateIntakePayload(payload)
    
    // Log validation results for monitoring
    log.info("Intake validation", {
      userId: user?.id || "anonymous",
      serviceType: payload.service_type,
      valid: validation.valid,
      errorCount: validation.errors.length,
      warningCount: validation.warnings.length,
      safetyBlockCount: validation.safetyBlocks.length,
    })
    
    // Log safety blocks separately for alerting
    if (validation.safetyBlocks.length > 0) {
      log.warn("Intake safety blocks triggered", {
        userId: user?.id || "anonymous",
        blocks: validation.safetyBlocks,
      })
    }
    
    return NextResponse.json({
      valid: validation.valid,
      errors: validation.errors,
      warnings: validation.warnings,
      safetyBlocks: validation.safetyBlocks,
      // Only return sanitized data if validation passed
      data: validation.valid ? validation.sanitizedData : null,
    })
    
  } catch (error) {
    log.error("Validation endpoint error", { error })
    return NextResponse.json(
      { valid: false, errors: ['Server error during validation'] },
      { status: 500 }
    )
  }
}
