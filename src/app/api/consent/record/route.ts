import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { recordConsents } from '@/lib/consent/validate'
import type { ConsentType } from '@/types/database'
import { z } from 'zod'

const recordConsentSchema = z.object({
  intakeId: z.string().uuid(),
  patientId: z.string().uuid(),
  consents: z.array(
    z.object({
      type: z.enum([
        'telehealth_terms',
        'privacy_policy',
        'fee_agreement',
        'escalation_agreement',
        'medication_consent',
        'treatment_consent',
      ]),
      version: z.string(),
      textHash: z.string(),
    })
  ),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verify authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse and validate request body
    const body = await request.json()
    const validation = recordConsentSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.format() },
        { status: 400 }
      )
    }

    const { intakeId, patientId, consents } = validation.data

    // Verify the intake belongs to this user
    const { data: intake, error: intakeError } = await supabase
      .from('intakes')
      .select('id, patient_id')
      .eq('id', intakeId)
      .single()

    if (intakeError || !intake) {
      return NextResponse.json({ error: 'Intake not found' }, { status: 404 })
    }

    // Verify the user owns this intake
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (!profile || profile.id !== intake.patient_id) {
      return NextResponse.json(
        { error: 'Not authorized to modify this intake' },
        { status: 403 }
      )
    }

    // Get client info for audit trail
    const clientIp =
      request.headers.get('x-forwarded-for')?.split(',')[0] ||
      request.headers.get('x-real-ip') ||
      'unknown'
    const clientUserAgent = request.headers.get('user-agent') || 'unknown'

    // Record the consents
    const result = await recordConsents({
      intakeId,
      patientId,
      consents: consents.map((c) => ({
        type: c.type as ConsentType,
        version: c.version,
        textHash: c.textHash,
      })),
      clientIp,
      clientUserAgent,
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to record consents' },
        { status: 500 }
      )
    }

    // Log audit event
    await supabase.rpc('log_audit_event', {
      p_event_type: 'consent_given',
      p_description: `Patient granted ${consents.length} consent(s)`,
      p_intake_id: intakeId,
      p_profile_id: patientId,
      p_actor_type: 'patient',
      p_metadata: { consent_types: consents.map((c) => c.type) },
      p_client_ip: clientIp,
      p_client_user_agent: clientUserAgent,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Consent record error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
