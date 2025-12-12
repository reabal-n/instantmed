import type { AttachmentType } from '@/types/database'

// ============================================
// ATTACHMENT TYPES
// ============================================

export interface UploadConfig {
  maxSizeBytes: number
  allowedTypes: string[]
  allowedExtensions: string[]
}

export const DEFAULT_UPLOAD_CONFIG: UploadConfig = {
  maxSizeBytes: 10 * 1024 * 1024, // 10MB
  allowedTypes: [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
  allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp', '.heic', '.pdf', '.doc', '.docx'],
}

export interface UploadParams {
  intakeId: string
  file: File
  attachmentType: AttachmentType
  description?: string
  messageId?: string
}

export interface UploadResult {
  success: boolean
  attachment?: AttachmentRecord
  error?: string
}

export interface AttachmentRecord {
  id: string
  intake_id: string
  uploaded_by_id: string
  file_name: string
  file_type: string
  file_size_bytes: number
  attachment_type: AttachmentType
  storage_bucket: string
  storage_path: string
  description: string | null
  is_verified: boolean
  created_at: string
}

export interface SignedUrlResult {
  success: boolean
  url?: string
  error?: string
}

export const ATTACHMENT_TYPE_LABELS: Record<AttachmentType, string> = {
  id_document: 'ID Document',
  medical_record: 'Medical Record',
  prescription: 'Prescription',
  referral: 'Referral Letter',
  pathology_result: 'Pathology Result',
  photo: 'Photo',
  other: 'Other Document',
}
