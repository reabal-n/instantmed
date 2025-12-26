import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const requestInfoSchema = z.object({
  intakeId: z.string().uuid(),
  questions: z.array(z.string().min(1)).min(1).max(5),
  notes: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verify authentication
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('auth_user_id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Parse request
    const body = await request.json()
    const validation = requestInfoSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.format() },
        { status: 400 }
      )
    }

    const { intakeId, questions, notes } = validation.data

    // Verify intake exists
    const { data: intake } = await supabase
      .from('intakes')
      .select('id, status, patient_id')
      .eq('id', intakeId)
      .single()

    if (!intake) {
      return NextResponse.json({ error: 'Intake not found' }, { status: 404 })
    }

    // Update intake status to pending_info
    const { error: updateError } = await supabase
      .from('intakes')
      .update({ status: 'pending_info' })
      .eq('id', intakeId)

    if (updateError) {
      console.error('Intake update error:', updateError)
      return NextResponse.json({ error: 'Failed to update intake' }, { status: 500 })
    }

    // Record admin action
    const { error: actionError } = await supabase.from('admin_actions').insert({
      intake_id: intakeId,
      admin_id: profile.id,
      action_type: 'requested_info',
      notes,
      questions_asked: { questions },
      new_status: 'pending_info',
    })

    if (actionError) {
      console.error('Admin action error:', actionError)
    }

    // Send system message to patient
    const questionsText = questions
      .map((q, i) => `${i + 1}. ${q}`)
      .join('\n')

    const { error: messageError } = await supabase.from('messages').insert({
      intake_id: intakeId,
      sender_id: profile.id,
      sender_type: 'system',
      content: `**Additional Information Required**\n\nOur doctor needs some more information before proceeding with your request:\n\n${questionsText}${notes ? `\n\n*Note: ${notes}*` : ''}\n\nPlease respond using the form on your request page.`,
      message_type: 'info_request',
      metadata: { questions, admin_notes: notes },
      is_internal: false,
      is_read: false,
    })

    if (messageError) {
      console.error('Message error:', messageError)
    }

    // Log audit event
    await supabase.rpc('log_audit_event', {
      p_event_type: 'admin_action',
      p_description: 'Admin requested more information from patient',
      p_intake_id: intakeId,
      p_profile_id: profile.id,
      p_actor_type: 'admin',
      p_new_state: { status: 'pending_info' },
      p_metadata: {
        action: 'request_info',
        question_count: questions.length,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Request info error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
