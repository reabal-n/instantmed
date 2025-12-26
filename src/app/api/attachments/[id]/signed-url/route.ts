import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface Props {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: Props) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Verify authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('auth_user_id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Get attachment with intake info
    const { data: attachment } = await supabase
      .from('attachments')
      .select(`
        id,
        storage_path,
        intake_id,
        intakes!inner (
          patient_id
        )
      `)
      .eq('id', id)
      .single()

    if (!attachment) {
      return NextResponse.json({ error: 'Attachment not found' }, { status: 404 })
    }

    // Check access
    const intakeData = attachment.intakes as unknown as { patient_id: string }
    const isPatient = profile.id === intakeData.patient_id
    const isAdmin = profile.role === 'admin'

    if (!isPatient && !isAdmin) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    // Generate signed URL (1 hour validity)
    const { data: signedData, error } = await supabase.storage
      .from('attachments')
      .createSignedUrl(attachment.storage_path, 3600)

    if (error || !signedData) {
      return NextResponse.json(
        { error: 'Failed to generate URL' },
        { status: 500 }
      )
    }

    return NextResponse.json({ url: signedData.signedUrl })
  } catch (error) {
    console.error('Signed URL error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
