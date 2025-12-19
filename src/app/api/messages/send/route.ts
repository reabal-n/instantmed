import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const sendMessageSchema = z.object({
  intakeId: z.string().uuid(),
  content: z.string().min(1).max(5000),
  senderType: z.enum(['patient', 'admin', 'system']),
  messageType: z.enum(['general', 'info_request', 'info_response', 'status_update', 'system']).optional(),
  metadata: z.record(z.unknown()).optional(),
  isInternal: z.boolean().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verify authentication
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request
    const body = await request.json()
    const validation = sendMessageSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.format() },
        { status: 400 }
      )
    }

    const { intakeId, content, senderType, messageType, metadata, isInternal } = validation.data

    // Get user's profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('auth_user_id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Verify access to intake
    const { data: intake } = await supabase
      .from('intakes')
      .select('id, patient_id')
      .eq('id', intakeId)
      .single()

    if (!intake) {
      return NextResponse.json({ error: 'Intake not found' }, { status: 404 })
    }

    // Check permissions
    const isPatient = profile.id === intake.patient_id
    const isAdmin = profile.role === 'admin'

    if (!isPatient && !isAdmin) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    // Validate sender type
    if (isPatient && senderType !== 'patient') {
      return NextResponse.json({ error: 'Invalid sender type' }, { status: 400 })
    }

    if (isAdmin && senderType === 'patient') {
      return NextResponse.json({ error: 'Invalid sender type' }, { status: 400 })
    }

    // Insert message
    const { data: message, error } = await supabase
      .from('messages')
      .insert({
        intake_id: intakeId,
        sender_id: profile.id,
        sender_type: senderType,
        content,
        message_type: messageType || 'general',
        metadata: metadata || {},
        is_internal: isInternal || false,
        is_read: false,
      })
      .select(`
        *,
        sender:profiles!sender_id (
          full_name,
          role
        )
      `)
      .single()

    if (error) {
      console.error('Insert message error:', error)
      return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
    }

    // Log audit event
    await supabase.rpc('log_audit_event', {
      p_event_type: 'message_sent',
      p_description: `Message sent by ${senderType}`,
      p_intake_id: intakeId,
      p_profile_id: profile.id,
      p_actor_type: senderType,
      p_metadata: {
        message_id: message.id,
        message_type: messageType,
      },
    })

    return NextResponse.json({ success: true, message })
  } catch (error) {
    console.error('Send message error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
