'use server'

import { createClient } from '@/lib/supabase/server'
import { getProfile } from '@/lib/supabase/auth'
import type { SendMessageParams, InfoRequestParams, Message } from './types'

// ============================================
// MESSAGING SERVER ACTIONS
// ============================================

/**
 * Send a message in an intake thread
 */
export async function sendMessage(params: SendMessageParams): Promise<{
  success: boolean
  message?: Message
  error?: string
}> {
  const supabase = await createClient()
  const profile = await getProfile()

  if (!profile) {
    return { success: false, error: 'Not authenticated' }
  }

  // Verify access to intake
  const { data: intake } = await supabase
    .from('intakes')
    .select('id, patient_id, status')
    .eq('id', params.intakeId)
    .single()

  if (!intake) {
    return { success: false, error: 'Intake not found' }
  }

  // Check permissions
  const isPatient = profile.id === intake.patient_id
  const isAdmin = profile.role === 'admin'

  if (!isPatient && !isAdmin) {
    return { success: false, error: 'Not authorized' }
  }

  // Patients can only send patient messages
  if (isPatient && params.senderType !== 'patient') {
    return { success: false, error: 'Invalid sender type' }
  }

  // Admins can send admin or system messages
  if (isAdmin && params.senderType === 'patient') {
    return { success: false, error: 'Invalid sender type' }
  }

  // Insert message
  const { data: message, error } = await supabase
    .from('messages')
    .insert({
      intake_id: params.intakeId,
      sender_id: profile.id,
      sender_type: params.senderType,
      content: params.content,
      message_type: params.messageType || 'general',
      metadata: params.metadata || {},
      is_internal: params.isInternal || false,
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
    console.error('Send message error:', error)
    return { success: false, error: 'Failed to send message' }
  }

  // Log audit event
  await supabase.rpc('log_audit_event', {
    p_event_type: 'message_sent',
    p_description: `Message sent by ${params.senderType}`,
    p_intake_id: params.intakeId,
    p_profile_id: profile.id,
    p_actor_type: params.senderType,
    p_metadata: {
      message_id: message.id,
      message_type: params.messageType,
      is_internal: params.isInternal,
    },
  })

  return { success: true, message: message as Message }
}

/**
 * Get messages for an intake
 */
export async function getMessages(intakeId: string): Promise<{
  success: boolean
  messages?: Message[]
  error?: string
}> {
  const supabase = await createClient()
  const profile = await getProfile()

  if (!profile) {
    return { success: false, error: 'Not authenticated' }
  }

  // Verify access to intake
  const { data: intake } = await supabase
    .from('intakes')
    .select('id, patient_id')
    .eq('id', intakeId)
    .single()

  if (!intake) {
    return { success: false, error: 'Intake not found' }
  }

  const isPatient = profile.id === intake.patient_id
  const isAdmin = profile.role === 'admin'

  if (!isPatient && !isAdmin) {
    return { success: false, error: 'Not authorized' }
  }

  // Build query
  let query = supabase
    .from('messages')
    .select(`
      *,
      sender:profiles!sender_id (
        full_name,
        role
      )
    `)
    .eq('intake_id', intakeId)
    .order('created_at', { ascending: true })

  // Patients can't see internal messages
  if (isPatient) {
    query = query.eq('is_internal', false)
  }

  const { data: messages, error } = await query

  if (error) {
    console.error('Get messages error:', error)
    return { success: false, error: 'Failed to fetch messages' }
  }

  return { success: true, messages: messages as Message[] }
}

/**
 * Mark messages as read
 */
export async function markMessagesRead(intakeId: string): Promise<void> {
  const supabase = await createClient()
  const profile = await getProfile()

  if (!profile) return

  // Get sender types that should be marked read
  // Patients mark admin/system messages as read
  // Admins mark patient messages as read
  const senderTypes = profile.role === 'admin' 
    ? ['patient'] 
    : ['admin', 'system']

  await supabase
    .from('messages')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('intake_id', intakeId)
    .in('sender_type', senderTypes)
    .eq('is_read', false)
}

/**
 * Admin: Request more information from patient
 */
export async function requestMoreInfo(params: InfoRequestParams): Promise<{
  success: boolean
  error?: string
}> {
  const supabase = await createClient()
  const profile = await getProfile()

  if (!profile || profile.role !== 'admin') {
    return { success: false, error: 'Not authorized' }
  }

  // Update intake status
  const { error: updateError } = await supabase
    .from('intakes')
    .update({ status: 'pending_info' })
    .eq('id', params.intakeId)

  if (updateError) {
    return { success: false, error: 'Failed to update intake status' }
  }

  // Record admin action
  await supabase.from('admin_actions').insert({
    intake_id: params.intakeId,
    admin_id: profile.id,
    action_type: 'requested_info',
    notes: params.notes,
    questions_asked: { questions: params.questions },
  })

  // Send system message
  const questionsText = params.questions
    .map((q, i) => `${i + 1}. ${q}`)
    .join('\n')

  await sendMessage({
    intakeId: params.intakeId,
    senderType: 'system',
    content: `Additional information requested:\n\n${questionsText}${params.notes ? `\n\nNote: ${params.notes}` : ''}`,
    messageType: 'info_request',
    metadata: { questions: params.questions },
  })

  // Log audit
  await supabase.rpc('log_audit_event', {
    p_event_type: 'admin_action',
    p_description: 'Admin requested more information',
    p_intake_id: params.intakeId,
    p_profile_id: profile.id,
    p_actor_type: 'admin',
    p_metadata: {
      action: 'request_info',
      questions: params.questions,
    },
  })

  return { success: true }
}

/**
 * Patient: Respond to info request
 */
export async function respondToInfoRequest(params: {
  intakeId: string
  responses: Array<{ question: string; answer: string }>
}): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const profile = await getProfile()

  if (!profile) {
    return { success: false, error: 'Not authenticated' }
  }

  // Verify intake ownership
  const { data: intake } = await supabase
    .from('intakes')
    .select('id, patient_id, status')
    .eq('id', params.intakeId)
    .single()

  if (!intake || intake.patient_id !== profile.id) {
    return { success: false, error: 'Not authorized' }
  }

  if (intake.status !== 'pending_info') {
    return { success: false, error: 'No pending info request' }
  }

  // Format response message
  const responseText = params.responses
    .map((r, i) => `**Q${i + 1}: ${r.question}**\n${r.answer}`)
    .join('\n\n')

  // Send response message
  await sendMessage({
    intakeId: params.intakeId,
    senderType: 'patient',
    content: `Responses to requested information:\n\n${responseText}`,
    messageType: 'info_response',
    metadata: { responses: params.responses },
  })

  // Update intake status back to in_review
  await supabase
    .from('intakes')
    .update({ status: 'in_review' })
    .eq('id', params.intakeId)

  return { success: true }
}
