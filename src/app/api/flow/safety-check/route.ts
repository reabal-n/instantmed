import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkSafetyForServer, evaluateSafety } from '@/lib/flow/safety'

/**
 * POST /api/flow/safety-check
 * 
 * Server-side safety check endpoint.
 * This provides a second layer of validation after client-side evaluation.
 * Used before allowing checkout to proceed.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { serviceSlug, answers, draftId, sessionId } = body

    if (!serviceSlug || !answers) {
      return NextResponse.json(
        { error: 'Missing required fields: serviceSlug, answers' },
        { status: 400 }
      )
    }

    // Run server-side safety check
    const safetyResult = checkSafetyForServer(serviceSlug, answers)
    const fullResult = evaluateSafety(serviceSlug, answers)

    // Log to database
    const supabase = await createClient()
    
    try {
      await supabase.rpc('log_safety_evaluation', {
        p_draft_id: draftId || null,
        p_session_id: sessionId || 'unknown',
        p_service_slug: serviceSlug,
        p_outcome: safetyResult.outcome,
        p_risk_tier: safetyResult.riskTier,
        p_triggered_rules: safetyResult.triggeredRuleIds,
        p_answers: answers,
        p_evaluation_duration_ms: Math.round(fullResult.evaluationDurationMs),
      })
    } catch (logError) {
      // Non-fatal - log but continue
      console.error('Failed to log safety evaluation:', logError)
    }

    // Return result
    return NextResponse.json({
      isAllowed: safetyResult.isAllowed,
      outcome: safetyResult.outcome,
      riskTier: safetyResult.riskTier,
      requiresCall: safetyResult.requiresCall,
      message: safetyResult.blockReason,
      // Don't expose triggered rule IDs to client for security
    })
  } catch (error) {
    console.error('Safety check error:', error)
    return NextResponse.json(
      { error: 'Internal server error during safety check' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/flow/safety-check
 * 
 * Verify a previous safety check result
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const draftId = searchParams.get('draftId')

  if (!draftId) {
    return NextResponse.json(
      { error: 'Missing draftId parameter' },
      { status: 400 }
    )
  }

  const supabase = await createClient()

  // Get the draft and its safety status
  const { data, error } = await supabase
    .from('intake_drafts')
    .select('safety_outcome, safety_risk_tier, safety_evaluated_at')
    .eq('id', draftId)
    .single()

  if (error || !data) {
    return NextResponse.json(
      { error: 'Draft not found' },
      { status: 404 }
    )
  }

  return NextResponse.json({
    outcome: data.safety_outcome,
    riskTier: data.safety_risk_tier,
    evaluatedAt: data.safety_evaluated_at,
    isAllowed: data.safety_outcome === 'ALLOW',
  })
}
