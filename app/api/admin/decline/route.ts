import { NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { notifyRequestStatusChange } from "@/lib/notifications/service"
import { createLogger } from "@/lib/observability/logger"
import { auth } from "@clerk/nextjs/server"
import { getPostHogClient } from "@/lib/posthog-server"
import { applyRateLimit } from "@/lib/rate-limit/redis"
import { requireValidCsrf } from "@/lib/security/csrf"
import { getUserEmailFromClerkUserId } from "@/lib/data/profiles"

const log = createLogger("admin-decline")

export async function POST(request: Request) {
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
    let clerkUserId: string | null = null

    if (apiKey && authHeader === `Bearer ${apiKey}`) {
      authorized = true
    } else {
      try {
        const { userId } = await auth()
        
        if (userId) {
          const supabase = createServiceRoleClient()
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role, id')
            .eq('clerk_user_id', userId)
            .single()

          if (!profileError && profile?.role === 'admin') {
            authorized = true
            clerkUserId = userId
          }
        }
      } catch (err) {
        log.warn('Admin auth check failed', {}, err)
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

    const supabase = createServiceRoleClient()

    const { data: currentIntake, error: fetchError } = await supabase
      .from('intakes')
      .select('status')
      .eq('id', intakeId)
      .single()

    if (fetchError || !currentIntake) {
      return NextResponse.json({ error: 'Intake not found' }, { status: 404 })
    }

    if (!['paid', 'in_review', 'pending_info'].includes(currentIntake.status)) {
      return NextResponse.json({ 
        error: `Cannot decline intake in ${currentIntake.status} status`, 
        code: 'INVALID_STATUS' 
      }, { status: 400 })
    }

    const { data: updated, error: updateError } = await supabase
      .from('intakes')
      .update({ 
        status: 'declined', 
        reviewed_by: 'admin', 
        reviewed_at: new Date().toISOString(), 
        updated_at: new Date().toISOString(),
        doctor_notes: reason ? `Declined: ${reason}` : 'Declined by admin'
      })
      .eq('id', intakeId)
      .select()
      .single()

    if (updateError || !updated) {
      log.error('Failed to decline intake', { intakeId }, updateError)
      return NextResponse.json({ error: 'Failed to update intake' }, { status: 500 })
    }

    const { data: intakeWithPatient, error: patientFetchError } = await supabase
      .from('intakes')
      .select(`
        id,
        patient_id,
        service:services!service_id ( name, type ),
        patient:profiles!patient_id (
          id,
          full_name,
          clerk_user_id,
          email
        )
      `)
      .eq('id', intakeId)
      .single()

    if (patientFetchError || !intakeWithPatient) {
      log.error('Failed to fetch patient for notification', { intakeId }, patientFetchError)
      return NextResponse.json({ success: true })
    }

    // Type-safe patient access
    interface PatientData {
      id: string
      full_name: string
      clerk_user_id: string
      email: string | null
    }

    const patientRaw = intakeWithPatient.patient
    const patient = (Array.isArray(patientRaw) ? patientRaw[0] : patientRaw) as PatientData | null
    const serviceRaw = intakeWithPatient.service
    const service = (Array.isArray(serviceRaw) ? serviceRaw[0] : serviceRaw) as { name: string; type: string } | null

    if (!patient) {
      log.error('Patient data missing from intake', { intakeId })
      return NextResponse.json({ success: true })
    }

    let patientEmail = patient.email
    if (!patientEmail && patient.clerk_user_id) {
      patientEmail = await getUserEmailFromClerkUserId(patient.clerk_user_id)
    }

    await notifyRequestStatusChange({
      requestId: intakeId,
      patientId: patient.id,
      patientEmail: patientEmail || '',
      patientName: patient.full_name || 'there',
      requestType: service?.type || 'med_certs',
      newStatus: 'declined',
      documentUrl: undefined,
    })

    // Track doctor declined in PostHog
    try {
      const posthog = getPostHogClient()
      posthog.capture({
        distinctId: patient.id,
        event: 'doctor_declined',
        properties: {
          intake_id: intakeId,
          service_type: service?.type,
          has_reason: !!reason,
        },
      })
    } catch { /* non-blocking */ }

    log.info('Intake declined by admin', { intakeId })
    return NextResponse.json({ success: true })
  } catch (err) {
    log.error('Unexpected error in admin decline', {}, err)
    return NextResponse.json({
      error: 'Failed to process decline. Please try again.'
    }, { status: 500 })
  }
}
