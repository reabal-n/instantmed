import { NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { notifyRequestStatusChange } from "@/lib/notifications/service"
import { createLogger } from "@/lib/observability/logger"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { applyRateLimit } from "@/lib/rate-limit/redis"
import { requireValidCsrf } from "@/lib/security/csrf"
import { auth } from "@clerk/nextjs/server"
import { getUserEmailFromAuthUserId } from "@/lib/auth/clerk-helpers"

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
          const serverSupabase = await createServerClient()
          const { data: profile, error: profileError } = await serverSupabase
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
    const { requestId, reason } = body

    if (!requestId) {
      return NextResponse.json({ error: 'Missing requestId' }, { status: 400 })
    }

    const supabase = createServiceRoleClient()

    // Check current request state before updating
    const { data: currentRequest, error: fetchError } = await supabase
      .from('requests')
      .select('status, payment_status')
      .eq('id', requestId)
      .single()

    if (fetchError || !currentRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }

    // Validate payment status - can only decline paid requests
    if (currentRequest.payment_status !== 'paid') {
      return NextResponse.json({ 
        error: 'Cannot decline unpaid request', 
        code: 'PAYMENT_REQUIRED' 
      }, { status: 400 })
    }

    // Validate current status allows decline
    if (!['pending', 'needs_follow_up'].includes(currentRequest.status)) {
      return NextResponse.json({ 
        error: `Cannot decline request in ${currentRequest.status} status`, 
        code: 'INVALID_STATUS' 
      }, { status: 400 })
    }

    // Update request to declined with admin audit fields
    const { data: updated, error: updateError } = await supabase
      .from('requests')
      .update({ 
        status: 'declined', 
        reviewed_by: 'admin', 
        reviewed_at: new Date().toISOString(), 
        updated_at: new Date().toISOString(),
        clinical_notes: reason ? `Declined: ${reason}` : 'Request declined by admin'
      })
      .eq('id', requestId)
      .select()
      .single()

    if (updateError || !updated) {
      log.error('Failed to decline request', { requestId }, updateError)
      return NextResponse.json({ error: 'Failed to update request' }, { status: 500 })
    }

    // Fetch patient/profile for notifications
    const { data: requestWithPatient, error: patientFetchError } = await supabase
      .from('requests')
      .select(`
        id,
        patient_id,
        category,
        subtype,
        patient:profiles!patient_id (
          id,
          full_name,
          auth_user_id
        )
      `)
      .eq('id', requestId)
      .single()

    if (patientFetchError || !requestWithPatient) {
      log.error('Failed to fetch patient for notification', { requestId }, patientFetchError)
      return NextResponse.json({ success: true }) // Request was declined, just notification failed
    }

    // Type-safe patient access
    interface PatientData {
      id: string
      full_name: string
      auth_user_id: string
    }

    // Supabase sometimes returns patient as an array due to join behavior
    const patientRaw = requestWithPatient.patient
    const patient = (Array.isArray(patientRaw) ? patientRaw[0] : patientRaw) as PatientData | null

    if (!patient) {
      log.error('Patient data missing from request', { requestId })
      return NextResponse.json({ success: true })
    }

    // Get email using Clerk helper (supports both clerk_user_id and legacy auth_user_id)
    const patientEmail = await getUserEmailFromAuthUserId(patient.auth_user_id)

    // Fire notifications
    await notifyRequestStatusChange({
      requestId,
      patientId: patient.id,
      patientEmail: patientEmail || '',
      patientName: patient.full_name || 'there',
      requestType: requestWithPatient.category || 'request',
      newStatus: 'declined',
      documentUrl: undefined,
    })

    log.info('Request declined by admin', { requestId })
    return NextResponse.json({ success: true })
  } catch (err) {
    log.error('Unexpected error in admin decline', {}, err)
    return NextResponse.json({
      error: 'Failed to process decline. Please try again.'
    }, { status: 500 })
  }
}
