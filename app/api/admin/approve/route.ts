import { NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { notifyRequestStatusChange } from "@/lib/notifications/service"
import { createLogger } from "@/lib/observability/logger"
import { auth } from "@clerk/nextjs/server"
import { applyRateLimit } from "@/lib/rate-limit/redis"
import { getUserEmailFromClerkUserId } from "@/lib/data/profiles"
import { requireValidCsrf } from "@/lib/security/csrf"
import { getClientIdentifier } from "@/lib/rate-limit/redis"
import { logTriageApproved } from "@/lib/audit/compliance-audit"
import type { RequestType } from "@/lib/audit/compliance-audit"

const log = createLogger("admin-approve")

// Valid statuses that can be transitioned to approved
const APPROVABLE_STATUSES = ["paid", "awaiting_review", "in_review", "pending_info"]

// Map service types to RequestType
function getRequestType(serviceType: string | null): RequestType {
  if (serviceType === "med_certs" || serviceType === "medical_certificate") return "med_cert"
  if (serviceType === "common_scripts" || serviceType === "prescription") return "repeat_rx"
  return "intake"
}

export async function POST(request: Request) {
  let body: { intakeId?: string } | null = null
  let actorId: string | null = null
  let authMethod: "api_key" | "session" = "session"

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
    const apiKey = process.env.INTERNAL_API_KEY
    let authorized = false
    const supabase = createServiceRoleClient()

    if (apiKey && authHeader === `Bearer ${apiKey}`) {
      authorized = true
      authMethod = "api_key"
      actorId = "system_api" // Track API key usage with identifiable actor
      const clientIp = getClientIdentifier(request)
      log.info('API key authentication used', {
        endpoint: '/api/admin/approve',
        clientIp,
        userAgent: request.headers.get('user-agent')?.slice(0, 100)
      })
    } else {
      try {
        const { userId } = await auth()

        if (userId) {
          // Apply rate limiting for authenticated users
          const rateLimitResponse = await applyRateLimit(request, 'sensitive', userId)
          if (rateLimitResponse) {
            return rateLimitResponse
          }

          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('id, role')
            .eq('clerk_user_id', userId)
            .single()

          if (!profileError && profile?.role === 'admin') {
            authorized = true
            actorId = profile.id // Use actual profile ID for audit trail
          }
        }
      } catch (err) {
        log.warn('Admin auth check failed', {}, err)
      }
    }

    if (!authorized) {
      log.warn('Unauthorized admin approve attempt', { hasAuthHeader: !!authHeader })
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    body = await request.json()
    const intakeId = body?.intakeId

    if (!intakeId) {
      return NextResponse.json({ error: 'Missing intakeId' }, { status: 400 })
    }

    // STEP 1: Fetch current intake status to prevent double-approval
    const { data: currentIntake, error: fetchError } = await supabase
      .from('intakes')
      .select('id, status, patient_id, service:services!service_id(type)')
      .eq('id', intakeId)
      .single()

    if (fetchError || !currentIntake) {
      return NextResponse.json({ error: 'Intake not found' }, { status: 404 })
    }

    // STEP 2: Validate status can be approved (idempotency check)
    if (currentIntake.status === 'approved') {
      log.info('Intake already approved, returning success', { intakeId })
      return NextResponse.json({ success: true, alreadyApproved: true })
    }

    if (!APPROVABLE_STATUSES.includes(currentIntake.status)) {
      return NextResponse.json({
        error: `Cannot approve intake with status '${currentIntake.status}'`
      }, { status: 400 })
    }

    const timestamp = new Date().toISOString()

    // STEP 3: Atomic update with status check
    const { data: updated, error: updateError } = await supabase
      .from('intakes')
      .update({
        status: 'approved',
        reviewed_by: actorId,
        reviewed_at: timestamp,
        updated_at: timestamp
      })
      .eq('id', intakeId)
      .in('status', APPROVABLE_STATUSES) // Only update if still in approvable state
      .select()
      .single()

    // STEP 4: Log compliance event for audit trail
    const serviceData = currentIntake.service as unknown as { type: string } | null
    const requestType = getRequestType(serviceData?.type || null)

    await logTriageApproved(
      intakeId,
      requestType,
      actorId || 'system_api',
      {
        previousStatus: currentIntake.status,
        authMethod,
        endpoint: '/api/admin/approve',
      }
    ).catch((err) => {
      log.warn('Failed to log compliance event', { intakeId }, err)
    })

    if (updateError || !updated) {
      return NextResponse.json({ error: 'Failed to update intake' }, { status: 500 })
    }

    const { data: intakeWithPatient } = await supabase
      .from('intakes')
      .select(`
        id,
        patient_id,
        service:services!service_id ( name, type ),
        patient:profiles!patient_id ( id, full_name, clerk_user_id, email )
      `)
      .eq('id', intakeId)
      .single()

    const { data: document } = await supabase
      .from('documents')
      .select('id, pdf_url')
      .eq('intake_id', intakeId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    const patientData = intakeWithPatient?.patient as unknown as { id: string; full_name: string; clerk_user_id: string | null; email: string | null } | null
    const notificationServiceData = intakeWithPatient?.service as unknown as { name: string; type: string } | null
    
    let patientEmail: string | null = patientData?.email ?? null
    if (!patientEmail && patientData?.clerk_user_id) {
      patientEmail = await getUserEmailFromClerkUserId(patientData.clerk_user_id)
    }
    
    const documentUrl = document?.pdf_url || null

    await notifyRequestStatusChange({
      requestId: intakeId,
      patientId: intakeWithPatient?.patient_id || patientData?.id,
      patientEmail: patientEmail || '',
      patientName: patientData?.full_name || 'there',
      requestType: notificationServiceData?.type || 'med_certs',
      newStatus: 'approved',
      documentUrl,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    log.error('Admin approve failed', { intakeId: body?.intakeId }, error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
