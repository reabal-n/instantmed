import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const actionSchema = z.object({
  intakeId: z.string().uuid(),
  action: z.enum(['approve', 'decline', 'escalate']),
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
      .select('id, role, can_approve_high_risk')
      .eq('auth_user_id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Parse request
    const body = await request.json()
    const validation = actionSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.format() },
        { status: 400 }
      )
    }

    const { intakeId, action, notes } = validation.data

    // Get intake
    const { data: intake } = await supabase
      .from('intakes')
      .select('id, status, risk_tier, patient_id')
      .eq('id', intakeId)
      .single()

    if (!intake) {
      return NextResponse.json({ error: 'Intake not found' }, { status: 404 })
    }

    // Check high-risk permissions
    const isHighRisk = intake.risk_tier === 'high' || intake.risk_tier === 'critical'
    if (isHighRisk && action === 'approve' && !profile.can_approve_high_risk) {
      return NextResponse.json(
        { error: 'Senior admin approval required for high-risk intakes' },
        { status: 403 }
      )
    }

    // Determine new status
    const statusMap: Record<string, string> = {
      approve: 'approved',
      decline: 'declined',
      escalate: 'escalated',
    }
    const newStatus = statusMap[action]

    // Update intake
    const updateData: Record<string, unknown> = {
      status: newStatus,
    }

    if (action === 'approve') {
      updateData.approved_at = new Date().toISOString()
      updateData.admin_notes = notes
    } else if (action === 'decline') {
      updateData.declined_at = new Date().toISOString()
      updateData.decline_reason = notes
    } else if (action === 'escalate') {
      updateData.requires_live_consult = true
      updateData.live_consult_reason = notes
      updateData.escalation_notes = notes
    }

    const { error: updateError } = await supabase
      .from('intakes')
      .update(updateData)
      .eq('id', intakeId)

    if (updateError) {
      console.error('Update error:', updateError)
      return NextResponse.json({ error: 'Failed to update intake' }, { status: 500 })
    }

    // Record admin action
    await supabase.from('admin_actions').insert({
      intake_id: intakeId,
      admin_id: profile.id,
      action_type: action === 'approve' ? 'approved' : action === 'decline' ? 'declined' : 'escalated',
      notes,
      previous_status: intake.status,
      new_status: newStatus,
    })

    // Log audit event
    await supabase.rpc('log_audit_event', {
      p_event_type: 'admin_action',
      p_description: `Intake ${action}ed by admin`,
      p_intake_id: intakeId,
      p_profile_id: profile.id,
      p_actor_type: 'admin',
      p_previous_state: { status: intake.status },
      p_new_state: { status: newStatus },
      p_metadata: { action, notes },
    })

    // Send system message to patient
    const messageContent: Record<string, string> = {
      approve: 'Great news! Your request has been approved. Your document will be ready shortly.',
      decline: `We're sorry, but your request could not be approved.${notes ? ` Reason: ${notes}` : ''} Please contact us if you have questions.`,
      escalate: 'Your request requires a phone or video consultation. We will contact you to schedule this.',
    }

    await supabase.from('messages').insert({
      intake_id: intakeId,
      sender_id: profile.id,
      sender_type: 'system',
      content: messageContent[action],
      message_type: 'status_update',
      is_internal: false,
      is_read: false,
    })

    return NextResponse.json({ success: true, status: newStatus })
  } catch (error) {
    console.error('Intake action error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
