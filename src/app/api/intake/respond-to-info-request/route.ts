import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const respondSchema = z.object({
  intakeId: z.string().uuid(),
  responses: z.array(
    z.object({
      question: z.string(),
      answer: z.string().min(1),
    })
  ),
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
    const validation = respondSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.format() },
        { status: 400 }
      )
    }

    const { intakeId, responses } = validation.data

    // Get user's profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Verify intake ownership and status
    const { data: intake } = await supabase
      .from('intakes')
      .select('id, patient_id, status')
      .eq('id', intakeId)
      .single()

    if (!intake || intake.patient_id !== profile.id) {
      return NextResponse.json({ error: 'Intake not found' }, { status: 404 })
    }

    if (intake.status !== 'pending_info') {
      return NextResponse.json(
        { error: 'No pending information request' },
        { status: 400 }
      )
    }

    // Format response message
    const responseText = responses
      .map((r, i) => `**Q${i + 1}: ${r.question}**\n${r.answer}`)
      .join('\n\n')

    // Send response message
    const { error: messageError } = await supabase.from('messages').insert({
      intake_id: intakeId,
      sender_id: profile.id,
      sender_type: 'patient',
      content: `Responses to requested information:\n\n${responseText}`,
      message_type: 'info_response',
      metadata: { responses },
      is_internal: false,
      is_read: false,
    })

    if (messageError) {
      console.error('Message insert error:', messageError)
      return NextResponse.json({ error: 'Failed to save response' }, { status: 500 })
    }

    // Update intake status back to in_review
    const { error: updateError } = await supabase
      .from('intakes')
      .update({ status: 'in_review' })
      .eq('id', intakeId)

    if (updateError) {
      console.error('Intake update error:', updateError)
      return NextResponse.json({ error: 'Failed to update intake' }, { status: 500 })
    }

    // Log audit event
    await supabase.rpc('log_audit_event', {
      p_event_type: 'admin_action',
      p_description: 'Patient responded to information request',
      p_intake_id: intakeId,
      p_profile_id: profile.id,
      p_actor_type: 'patient',
      p_metadata: {
        action: 'info_response',
        response_count: responses.length,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Respond to info request error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
