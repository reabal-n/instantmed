import { NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { createLogger } from "@/lib/observability/logger"
import { auth } from "@clerk/nextjs/server"
import { applyRateLimit } from "@/lib/rate-limit/redis"
import { requireValidCsrf } from "@/lib/security/csrf"
import { declineIntake } from "@/app/actions/decline-intake"
import { timingSafeEqual } from "crypto"

const log = createLogger("admin-decline")

/**
 * Admin Decline Route
 * 
 * Delegates to the canonical declineIntake action for consistent
 * refund + email + audit handling.
 */
export async function POST(request: Request) {
  let actorId: string | null = null

  try {
    // Get auth header first
    const authHeader = request.headers.get('authorization')
    const isApiKeyAuth = authHeader?.startsWith('Bearer ')

    // CSRF protection (skip for API key auth, only for session-based)
    if (!isApiKeyAuth) {
      const csrfError = await requireValidCsrf(request)
      if (csrfError) {
        return csrfError
      }
    }

    // Require either an internal API key OR an authenticated admin session
    const apiKey = process.env.INTERNAL_API_SECRET
    let authorized = false
    let clerkUserId: string | null = null
    const supabase = createServiceRoleClient()

    if (apiKey && authHeader) {
      const expected = Buffer.from(`Bearer ${apiKey}`)
      const provided = Buffer.from(authHeader)
      if (expected.length === provided.length && timingSafeEqual(expected, provided)) {
        authorized = true
        actorId = "system_api"
      }
    } else {
      try {
        const { userId } = await auth()

        if (userId) {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role, id')
            .eq('clerk_user_id', userId)
            .single()

          if (!profileError && profile?.role === 'admin') {
            authorized = true
            clerkUserId = userId
            actorId = profile.id
          }
        }
      } catch (err) {
        log.warn('Admin auth check failed', {}, err instanceof Error ? err : undefined)
      }
    }

    if (!authorized) {
      log.warn('Unauthorized admin decline attempt', { hasAuthHeader: !!authHeader })
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Rate limiting
    const rateLimitResponse = await applyRateLimit(request, 'sensitive', clerkUserId || undefined)
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    const body = await request.json()
    const { intakeId, reason } = body

    if (!intakeId) {
      return NextResponse.json({ error: 'Missing intakeId' }, { status: 400 })
    }

    // Delegate to canonical decline action
    const result = await declineIntake({
      intakeId,
      reason,
      actorId: actorId || undefined,
    })

    if (!result.success) {
      log.warn('Decline failed', { intakeId, error: result.error })
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    log.info('Intake declined via admin route', {
      intakeId,
      actorId,
      alreadyDeclined: result.alreadyDeclined,
      refundStatus: result.refund?.status,
      emailSent: result.emailSent,
    })

    return NextResponse.json({
      success: true,
      alreadyDeclined: result.alreadyDeclined,
      refund: result.refund ? {
        status: result.refund.status,
        stripeRefundId: result.refund.stripeRefundId,
        amount: result.refund.amount,
      } : undefined,
    })

  } catch (err) {
    log.error('Unexpected error in admin decline', {}, err instanceof Error ? err : undefined)
    return NextResponse.json({
      error: 'Failed to process decline. Please try again.'
    }, { status: 500 })
  }
}
