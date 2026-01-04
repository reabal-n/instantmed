import { NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { notifyRequestStatusChange } from "@/lib/notifications/service"
import { createLogger } from "@/lib/observability/logger"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { auth } from "@clerk/nextjs/server"
import { applyRateLimit } from "@/lib/rate-limit/redis"
import { getUserEmailFromAuthUserId } from "@/lib/auth/clerk-helpers"

const log = createLogger("admin-approve")

export async function POST(request: Request) {
  let body: { requestId?: string } | null = null
  
  try {
    // Require either an internal API key OR an authenticated admin session
    const apiKey = process.env.INTERNAL_API_KEY
    const authHeader = request.headers.get('authorization')
    let authorized = false
    let rateLimitKey = 'api-key'

    if (apiKey && authHeader === `Bearer ${apiKey}`) {
      authorized = true
    } else {
      try {
        const { userId } = await auth()
        if (userId) {
          rateLimitKey = userId
          
          // Apply rate limiting for authenticated users
          const rateLimitResponse = await applyRateLimit(request, 'sensitive', userId)
          if (rateLimitResponse) {
            return rateLimitResponse
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
        log.warn('Admin auth check failed', {}, err)
      }
    }

    if (!authorized) {
      log.warn('Unauthorized admin approve attempt', { hasAuthHeader: !!authHeader })
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    body = await request.json()
    const requestId = body?.requestId

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
    const patientData = requestWithPatient?.patient as unknown as { id: string; full_name: string; auth_user_id: string | null; clerk_user_id?: string | null } | null
    
    // Try to get email from Clerk first, fallback to auth_user_id (legacy)
    let patientEmail: string | null = null
    if (patientData?.clerk_user_id) {
      const { getUserEmailFromClerkId } = await import("@/lib/auth/clerk-helpers")
      patientEmail = await getUserEmailFromClerkId(patientData.clerk_user_id)
    } else if (patientData?.auth_user_id) {
      patientEmail = await getUserEmailFromAuthUserId(patientData.auth_user_id)
    }
    
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
  } catch (error) {
    log.error('Admin approve failed', { requestId: body?.requestId }, error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
