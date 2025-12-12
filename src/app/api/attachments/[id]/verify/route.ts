import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface Props {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, { params }: Props) {
  try {
    const { id } = await params
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

    // Update attachment
    const { data: attachment, error } = await supabase
      .from('attachments')
      .update({
        is_verified: true,
        verified_at: new Date().toISOString(),
        verified_by_id: profile.id,
      })
      .eq('id', id)
      .select(`
        id,
        file_name,
        intake_id
      `)
      .single()

    if (error) {
      return NextResponse.json({ error: 'Failed to verify attachment' }, { status: 500 })
    }

    // Log audit event
    await supabase.rpc('log_audit_event', {
      p_event_type: 'admin_action',
      p_description: `Document verified: ${attachment.file_name}`,
      p_intake_id: attachment.intake_id,
      p_profile_id: profile.id,
      p_actor_type: 'admin',
      p_metadata: { attachment_id: id },
    })

    return NextResponse.json({ success: true, attachment })
  } catch (error) {
    console.error('Verify attachment error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
