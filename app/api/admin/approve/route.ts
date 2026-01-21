import { NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { notifyRequestStatusChange } from "@/lib/notifications/service"
import { createLogger } from "@/lib/observability/logger"
import { auth } from "@clerk/nextjs/server"
import { applyRateLimit } from "@/lib/rate-limit/redis"
import { getUserEmailFromClerkUserId } from "@/lib/data/profiles"
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
        const { userId } = await auth()
        
        if (userId) {
          // Apply rate limiting for authenticated users
          const rateLimitResponse = await applyRateLimit(request, 'sensitive', userId)
          if (rateLimitResponse) {
            return rateLimitResponse
          }
          
          const supabase = createServiceRoleClient()
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('clerk_user_id', userId)
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
    const serviceData = intakeWithPatient?.service as unknown as { name: string; type: string } | null
    
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
