import { NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { notifyRequestStatusChange } from "@/lib/notifications/service"
import { logger } from "@/lib/logger"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { rateLimit } from "@/lib/rate-limit/limiter"
import { requireValidCsrf } from "@/lib/security/csrf"
import type { SupabaseClient } from "@supabase/supabase-js"

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
    let userId: string | null = null

    if (apiKey && authHeader === `Bearer ${apiKey}`) {
      authorized = true
    } else {
      try {
        const serverSupabase = await createServerClient()
        const { data: { user } } = await serverSupabase.auth.getUser()
        if (user) {
          const { data: profile, error: profileError } = await serverSupabase
            .from('profiles')
            .select('role, id')
            .eq('auth_user_id', user.id)
            .single()

          if (!profileError && profile?.role === 'admin') {
            authorized = true
            userId = user.id
          }
        }
      } catch (err) {
        logger.warn('Admin auth check failed', { err })
      }
    }

    if (!authorized) {
      logger.warn('Unauthorized admin approve attempt', { header: authHeader })
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Rate limiting: 60 approvals per hour per admin
    const rateLimitResult = await rateLimit(userId, '/api/admin/approve')
    if (!rateLimitResult.allowed) {
      logger.warn('Rate limit exceeded for admin approve', { userId })
      return NextResponse.json(
        {
          error: 'Too many requests. Please try again later.',
          retryAfter: rateLimitResult.retryAfter
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimitResult.retryAfter || 60)
          }
        }
      )
    }
    const body = await request.json()
    const { requestId } = body

    if (!requestId) {
      return NextResponse.json({ error: 'Missing requestId' }, { status: 400 })
    }

    const supabase = createServiceRoleClient()

    // Check current request state before updating
    const { data: currentRequest, error: fetchError } = await supabase
      .from('requests')
      .select('status, payment_status, category')
      .eq('id', requestId)
      .single()

    if (fetchError || !currentRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }

    // Validate payment status
    if (currentRequest.payment_status !== 'paid') {
      return NextResponse.json({ 
        error: 'Cannot approve unpaid request', 
        code: 'PAYMENT_REQUIRED' 
      }, { status: 400 })
    }

    // Validate current status allows approval
    if (!['pending', 'needs_follow_up'].includes(currentRequest.status)) {
      return NextResponse.json({ 
        error: `Cannot approve request in ${currentRequest.status} status`, 
        code: 'INVALID_STATUS' 
      }, { status: 400 })
    }

    // For medical certificates, require a document to exist before approval
    // This ensures the patient will receive their certificate via email
    if (currentRequest.category === 'medical_certificate') {
      const { data: existingDoc } = await supabase
        .from('documents')
        .select('id, pdf_url')
        .eq('request_id', requestId)
        .limit(1)
        .single()

      if (!existingDoc || !existingDoc.pdf_url) {
        return NextResponse.json({ 
          error: 'Medical certificate must be generated before approval. Please use the document builder.',
          code: 'DOCUMENT_REQUIRED' 
        }, { status: 400 })
      }
    }

    // Update request to approved with admin audit fields
    const { data: updated, error: updateError } = await supabase
      .from('requests')
      .update({ status: 'approved', reviewed_by: 'admin', reviewed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', requestId)
      .select()
      .single()

    if (updateError || !updated) {
      return NextResponse.json({ error: 'Failed to update request' }, { status: 500 })
    }

    // Fetch patient/profile and latest document (if any)
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
      logger.error('Failed to fetch patient for notification', {
        error: patientFetchError,
        requestId
      })
      return NextResponse.json({ success: true }) // Request was approved, just notification failed
    }

    const { data: document } = await supabase
      .from('documents')
      .select('id, pdf_url')
      .eq('request_id', requestId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

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
      logger.error('Patient data missing from request', { requestId })
      return NextResponse.json({ success: true })
    }

    const patientEmail = await getEmailForAuthUser(supabase, patient.auth_user_id)
    const documentUrl = document?.pdf_url || null

    // Fire notifications + email if document available
    await notifyRequestStatusChange({
      requestId,
      patientId: patient.id,
      patientEmail: patientEmail || '',
      patientName: patient.full_name || 'there',
      requestType: requestWithPatient.category || 'request',
      newStatus: 'approved',
      documentUrl,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    logger.error('Unexpected error in admin approve', {
      error: err instanceof Error ? err.message : String(err)
    })
    return NextResponse.json({
      error: 'Failed to process approval. Please try again.'
    }, { status: 500 })
  }
}

async function getEmailForAuthUser(
  supabase: SupabaseClient,
  authUserId: string
): Promise<string | null> {
  try {
    const { data: authUser, error } = await supabase.auth.admin.getUserById(authUserId)
    if (error) {
      logger.error('Failed to get user email', { error, authUserId })
      return null
    }
    return authUser?.user?.email || null
  } catch (error) {
    logger.error('Exception getting user email', {
      error: error instanceof Error ? error.message : String(error)
    })
    return null
  }
}
