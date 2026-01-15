import { NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { notifyRequestStatusChange } from "@/lib/notifications/service"
import { createLogger } from "@/lib/observability/logger"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { applyRateLimit } from "@/lib/rate-limit/redis"
import { getUserEmailFromAuthUserId } from "@/lib/data/profiles"
import { requireValidCsrf } from "@/lib/security/csrf"
import { getClientIdentifier } from "@/lib/rate-limit/redis"

const log = createLogger("admin-approve")

export async function POST(request: Request) {
  let body: { intakeId?: string } | null = null
  
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

    if (apiKey && authHeader === `Bearer ${apiKey}`) {
      authorized = true
      // P1-3: Audit log API key usage
      const clientIp = getClientIdentifier(request)
      log.info('API key authentication used', { 
        endpoint: '/api/admin/approve',
        clientIp,
        userAgent: request.headers.get('user-agent')?.slice(0, 100)
      })
    } else {
      try {
        const serverSupabase = await createServerClient()
        const { data: { user } } = await serverSupabase.auth.getUser()
        
        if (user) {
          
          // Apply rate limiting for authenticated users
          const rateLimitResponse = await applyRateLimit(request, 'sensitive', user.id)
          if (rateLimitResponse) {
            return rateLimitResponse
          }
          
          const { data: profile, error: profileError } = await serverSupabase
            .from('profiles')
            .select('role')
            .eq('auth_user_id', user.id)
            .single()

          if (!profileError && profile?.role === 'admin') {
            authorized = true
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

    const supabase = createServiceRoleClient()

    const { data: updated, error: updateError } = await supabase
      .from('intakes')
      .update({ status: 'approved', reviewed_by: 'admin', reviewed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', intakeId)
      .select()
      .single()

    if (updateError || !updated) {
      return NextResponse.json({ error: 'Failed to update intake' }, { status: 500 })
    }

    const { data: intakeWithPatient } = await supabase
      .from('intakes')
      .select(`
        id,
        patient_id,
        service:services!service_id ( name, type ),
        patient:profiles!patient_id ( id, full_name, auth_user_id, email )
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

    const patientData = intakeWithPatient?.patient as unknown as { id: string; full_name: string; auth_user_id: string | null; email: string | null } | null
    const serviceData = intakeWithPatient?.service as unknown as { name: string; type: string } | null
    
    let patientEmail: string | null = patientData?.email ?? null
    if (!patientEmail && patientData?.auth_user_id) {
      patientEmail = await getUserEmailFromAuthUserId(patientData.auth_user_id)
    }
    
    const documentUrl = document?.pdf_url || null

    await notifyRequestStatusChange({
      requestId: intakeId,
      patientId: intakeWithPatient?.patient_id || patientData?.id,
      patientEmail: patientEmail || '',
      patientName: patientData?.full_name || 'there',
      requestType: serviceData?.type || 'med_certs',
      newStatus: 'approved',
      documentUrl,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    log.error('Admin approve failed', { intakeId: body?.intakeId }, error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
