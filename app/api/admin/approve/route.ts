import { NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { notifyRequestStatusChange } from "@/lib/notifications/service"
import { logger } from "@/lib/logger"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { auth } from "@clerk/nextjs/server"
import { rateLimit } from "@/lib/rate-limit/limiter"
import { requireValidCsrf } from "@/lib/security/csrf"

export async function POST(request: Request) {
  try {
    // Get auth header first to determine auth method
    const apiKey = process.env.INTERNAL_API_KEY
    const authHeader = request.headers.get('authorization')
    const isApiKeyAuth = authHeader === `Bearer ${apiKey}`

    // CSRF protection (skip for API key auth, only for session-based)
    if (!isApiKeyAuth) {
      const csrfError = await requireValidCsrf(request)
      if (csrfError) {
        return csrfError
      }
    }

    // Require either an internal API key OR an authenticated admin session
    let authorized = false
    let rateLimitKey = 'api-key'

    if (isApiKeyAuth) {
      authorized = true
    } else {
      try {
        const { userId } = await auth()
        if (userId) {
          rateLimitKey = userId
          
          // Apply rate limiting for authenticated users
          const rateLimitResult = await rateLimit(userId, '/api/admin/approve')
          if (!rateLimitResult.allowed) {
            return NextResponse.json(
              { error: 'Rate limit exceeded. Please try again later.' },
              { status: 429, headers: { 'Retry-After': '60' } }
            )
          }
          
          const serverSupabase = await createServerClient()
          const { data: profile, error: profileError } = await serverSupabase
            .from('profiles')
            .select('role')
            .eq('clerk_user_id', userId)
            .single()

          if (!profileError && profile?.role === 'admin') {
            authorized = true
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
    const body = await request.json()
    const { requestId } = body

    if (!requestId) {
      return NextResponse.json({ error: 'Missing requestId' }, { status: 400 })
    }

    const supabase = createServiceRoleClient()

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
    const { data: requestWithPatient } = await supabase
      .from('requests')
      .select(`
        id,
        patient_id,
        category,
        subtype,
        patient:profiles!patient_id ( id, full_name, auth_user_id )
      `)
      .eq('id', requestId)
      .single()

    const { data: document } = await supabase
      .from('documents')
      .select('id, pdf_url')
      .eq('request_id', requestId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    // Extract patient from the relation - cast through unknown since Supabase types are imprecise for relations
    const patientData = requestWithPatient?.patient as unknown as { id: string; full_name: string; auth_user_id: string | null } | null
    const patientEmail = patientData?.auth_user_id ? await getEmailForAuthUser(supabase, patientData.auth_user_id) : null
    const documentUrl = document?.pdf_url || null

    // Fire notifications + email if document available
    await notifyRequestStatusChange({
      requestId,
      patientId: requestWithPatient?.patient_id || patientData?.id,
      patientEmail: patientEmail || '',
      patientName: patientData?.full_name || 'there',
      requestType: requestWithPatient?.category || 'request',
      newStatus: 'approved',
      documentUrl,
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function getEmailForAuthUser(supabase: ReturnType<typeof createServiceRoleClient>, authUserId: string): Promise<string | null> {
  try {
    const { data: authUser } = await supabase.auth.admin.getUserById(authUserId)
    return authUser?.user?.email || null
  } catch {
    return null
  }
}
