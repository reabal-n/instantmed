import { createClient } from '@/lib/supabase/server'
import { getProfile } from '@/lib/supabase/auth'
import type { UploadParams, UploadResult, SignedUrlResult, AttachmentRecord } from './types'
import { DEFAULT_UPLOAD_CONFIG } from './types'
import type { AttachmentType } from '@/types/database'

// ============================================
// SERVER-SIDE UPLOAD FUNCTIONS
// ============================================

/**
 * Validate file before upload
 */
export function validateFile(file: File): { valid: boolean; error?: string } {
  const config = DEFAULT_UPLOAD_CONFIG

  // Check size
  if (file.size > config.maxSizeBytes) {
    const maxMB = config.maxSizeBytes / (1024 * 1024)
    return { valid: false, error: `File size exceeds ${maxMB}MB limit` }
  }

  // Check type
  if (!config.allowedTypes.includes(file.type)) {
    return { valid: false, error: 'File type not allowed. Accepted: JPG, PNG, PDF, DOC' }
  }

  // Check extension
  const extension = '.' + file.name.split('.').pop()?.toLowerCase()
  if (!config.allowedExtensions.includes(extension)) {
    return { valid: false, error: 'File extension not allowed' }
  }

  return { valid: true }
}

/**
 * Upload a file to Supabase Storage
 */
export async function uploadAttachment(params: UploadParams): Promise<UploadResult> {
  const supabase = await createClient()
  const profile = await getProfile()

  if (!profile) {
    return { success: false, error: 'Not authenticated' }
  }

  // Validate file
  const validation = validateFile(params.file)
  if (!validation.valid) {
    return { success: false, error: validation.error }
  }

  // Verify access to intake
  const { data: intake } = await supabase
    .from('intakes')
    .select('id, patient_id')
    .eq('id', params.intakeId)
    .single()

  if (!intake) {
    return { success: false, error: 'Intake not found' }
  }

  const isPatient = profile.id === intake.patient_id
  const isAdmin = profile.role === 'admin'

  if (!isPatient && !isAdmin) {
    return { success: false, error: 'Not authorized' }
  }

  // Generate unique file path
  const timestamp = Date.now()
  const sanitizedName = params.file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
  const storagePath = `${params.intakeId}/${timestamp}_${sanitizedName}`

  // Upload to storage
  const { error: uploadError } = await supabase.storage
    .from('attachments')
    .upload(storagePath, params.file, {
      cacheControl: '3600',
      upsert: false,
    })

  if (uploadError) {
    console.error('Storage upload error:', uploadError)
    return { success: false, error: 'Failed to upload file' }
  }

  // Create attachment record
  const { data: attachment, error: dbError } = await supabase
    .from('attachments')
    .insert({
      intake_id: params.intakeId,
      uploaded_by_id: profile.id,
      message_id: params.messageId || null,
      file_name: params.file.name,
      file_type: params.file.type,
      file_size_bytes: params.file.size,
      attachment_type: params.attachmentType,
      storage_bucket: 'attachments',
      storage_path: storagePath,
      description: params.description || null,
      is_verified: false,
    })
    .select()
    .single()

  if (dbError) {
    console.error('Attachment record error:', dbError)
    // Try to clean up the uploaded file
    await supabase.storage.from('attachments').remove([storagePath])
    return { success: false, error: 'Failed to create attachment record' }
  }

  // Log audit event
  await supabase.rpc('log_audit_event', {
    p_event_type: 'admin_action',
    p_description: `File uploaded: ${params.file.name}`,
    p_intake_id: params.intakeId,
    p_profile_id: profile.id,
    p_actor_type: isAdmin ? 'admin' : 'patient',
    p_metadata: {
      attachment_id: attachment.id,
      file_name: params.file.name,
      file_type: params.file.type,
      file_size: params.file.size,
      attachment_type: params.attachmentType,
    },
  })

  return { success: true, attachment: attachment as AttachmentRecord }
}

/**
 * Get a signed URL for viewing an attachment
 */
export async function getSignedUrl(attachmentId: string): Promise<SignedUrlResult> {
  const supabase = await createClient()
  const profile = await getProfile()

  if (!profile) {
    return { success: false, error: 'Not authenticated' }
  }

  // Get attachment record
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
    .eq('id', attachmentId)
    .single()

  if (!attachment) {
    return { success: false, error: 'Attachment not found' }
  }

  // Check access
  const intakeData = attachment.intakes as unknown as { patient_id: string }
  const isPatient = profile.id === intakeData.patient_id
  const isAdmin = profile.role === 'admin'

  if (!isPatient && !isAdmin) {
    return { success: false, error: 'Not authorized' }
  }

  // Generate signed URL (valid for 1 hour)
  const { data: signedData, error } = await supabase.storage
    .from('attachments')
    .createSignedUrl(attachment.storage_path, 3600)

  if (error || !signedData) {
    return { success: false, error: 'Failed to generate URL' }
  }

  return { success: true, url: signedData.signedUrl }
}

/**
 * Get all attachments for an intake
 */
export async function getIntakeAttachments(intakeId: string): Promise<AttachmentRecord[]> {
  const supabase = await createClient()
  const profile = await getProfile()

  if (!profile) {
    return []
  }

  // Verify access
  const { data: intake } = await supabase
    .from('intakes')
    .select('patient_id')
    .eq('id', intakeId)
    .single()

  if (!intake) {
    return []
  }

  const isPatient = profile.id === intake.patient_id
  const isAdmin = profile.role === 'admin'

  if (!isPatient && !isAdmin) {
    return []
  }

  const { data: attachments } = await supabase
    .from('attachments')
    .select('*')
    .eq('intake_id', intakeId)
    .order('created_at', { ascending: false })

  return (attachments as AttachmentRecord[]) || []
}

/**
 * Admin: Verify an attachment (e.g., ID document)
 */
export async function verifyAttachment(attachmentId: string): Promise<{
  success: boolean
  error?: string
}> {
  const supabase = await createClient()
  const profile = await getProfile()

  if (!profile || profile.role !== 'admin') {
    return { success: false, error: 'Admin access required' }
  }

  const { error } = await supabase
    .from('attachments')
    .update({
      is_verified: true,
      verified_at: new Date().toISOString(),
      verified_by_id: profile.id,
    })
    .eq('id', attachmentId)

  if (error) {
    return { success: false, error: 'Failed to verify attachment' }
  }

  return { success: true }
}

/**
 * Delete an attachment (only for drafts)
 */
export async function deleteAttachment(attachmentId: string): Promise<{
  success: boolean
  error?: string
}> {
  const supabase = await createClient()
  const profile = await getProfile()

  if (!profile) {
    return { success: false, error: 'Not authenticated' }
  }

  // Get attachment with intake status
  const { data: attachment } = await supabase
    .from('attachments')
    .select(`
      id,
      storage_path,
      uploaded_by_id,
      intake_id,
      intakes!inner (
        status,
        patient_id
      )
    `)
    .eq('id', attachmentId)
    .single()

  if (!attachment) {
    return { success: false, error: 'Attachment not found' }
  }

  const intakeData = attachment.intakes as unknown as { status: string; patient_id: string }

  // Check permissions
  const isOwner = attachment.uploaded_by_id === profile.id
  const isDraft = ['draft', 'pending_payment'].includes(intakeData.status)
  const isAdmin = profile.role === 'admin'

  if (!isAdmin && (!isOwner || !isDraft)) {
    return { success: false, error: 'Cannot delete this attachment' }
  }

  // Delete from storage
  await supabase.storage.from('attachments').remove([attachment.storage_path])

  // Delete record
  const { error } = await supabase
    .from('attachments')
    .delete()
    .eq('id', attachmentId)

  if (error) {
    return { success: false, error: 'Failed to delete attachment' }
  }

  return { success: true }
}
