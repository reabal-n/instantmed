import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { validateFile, DEFAULT_UPLOAD_CONFIG } from '@/lib/attachments/types'
import type { AttachmentType } from '@/types/database'

export async function POST(request: NextRequest) {
  try {
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

    // Parse form data
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const intakeId = formData.get('intakeId') as string | null
    const attachmentType = formData.get('attachmentType') as AttachmentType | null

    if (!file || !intakeId || !attachmentType) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate file
    if (file.size > DEFAULT_UPLOAD_CONFIG.maxSizeBytes) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB' },
        { status: 400 }
      )
    }

    if (!DEFAULT_UPLOAD_CONFIG.allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'File type not allowed' },
        { status: 400 }
      )
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

    const isPatient = profile.id === intake.patient_id
    const isAdmin = profile.role === 'admin'

    if (!isPatient && !isAdmin) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    // Generate storage path
    const timestamp = Date.now()
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const storagePath = `${intakeId}/${timestamp}_${sanitizedName}`

    // Convert File to ArrayBuffer for upload
    const arrayBuffer = await file.arrayBuffer()
    const buffer = new Uint8Array(arrayBuffer)

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from('attachments')
      .upload(storagePath, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false,
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      return NextResponse.json(
        { error: 'Failed to upload file' },
        { status: 500 }
      )
    }

    // Create attachment record
    const { data: attachment, error: dbError } = await supabase
      .from('attachments')
      .insert({
        intake_id: intakeId,
        uploaded_by_id: profile.id,
        file_name: file.name,
        file_type: file.type,
        file_size_bytes: file.size,
        attachment_type: attachmentType,
        storage_bucket: 'attachments',
        storage_path: storagePath,
        is_verified: false,
      })
      .select()
      .single()

    if (dbError) {
      console.error('Attachment record error:', dbError)
      // Clean up uploaded file
      await supabase.storage.from('attachments').remove([storagePath])
      return NextResponse.json(
        { error: 'Failed to create attachment record' },
        { status: 500 }
      )
    }

    // Log audit event
    await supabase.rpc('log_audit_event', {
      p_event_type: 'admin_action',
      p_description: `File uploaded: ${file.name}`,
      p_intake_id: intakeId,
      p_profile_id: profile.id,
      p_actor_type: isAdmin ? 'admin' : 'patient',
      p_metadata: {
        attachment_id: attachment.id,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
        attachment_type: attachmentType,
      },
    })

    return NextResponse.json({ success: true, attachment })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
