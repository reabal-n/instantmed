import type { MessageSenderType } from '@/types/database'

// ============================================
// MESSAGING TYPES
// ============================================

export interface Message {
  id: string
  intake_id: string
  sender_id: string | null
  sender_type: MessageSenderType
  content: string
  message_type: 'general' | 'info_request' | 'info_response' | 'status_update' | 'system'
  metadata: Record<string, unknown>
  is_read: boolean
  read_at: string | null
  is_internal: boolean
  created_at: string
  // Joined data
  sender?: {
    full_name: string
    role: string
  }
}

export interface SendMessageParams {
  intakeId: string
  content: string
  senderType: MessageSenderType
  messageType?: Message['message_type']
  metadata?: Record<string, unknown>
  isInternal?: boolean
}

export interface InfoRequestParams {
  intakeId: string
  questions: string[]
  notes?: string
}
