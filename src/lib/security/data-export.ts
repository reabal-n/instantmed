// ============================================
// DATA EXPORT/RETENTION: GDPR/Australian Privacy compliance
// ============================================

import { createClient } from '@/lib/supabase/server'
import { getProfile } from '@/lib/supabase/auth'

// Australian healthcare record retention: 7 years from last interaction
const RETENTION_YEARS = 7
const MIN_RETENTION_DAYS = RETENTION_YEARS * 365

export interface ExportedIntakeData {
  intake: {
    reference_number: string
    status: string
    created_at: string
    submitted_at: string | null
    completed_at: string | null
    service_name: string
    amount_paid: number | null
  }
  answers: Record<string, unknown> | null
  consents: Array<{
    type: string
    granted_at: string
    version: string
  }>
  messages: Array<{
    content: string
    sender_type: string
    created_at: string
  }>
  admin_actions: Array<{
    action_type: string
    notes: string | null
    created_at: string
  }>
  attachments: Array<{
    file_name: string
    attachment_type: string
    created_at: string
  }>
}

export interface PatientDataExport {
  profile: {
    full_name: string
    email: string
    date_of_birth: string | null
    phone: string | null
    address: string | null
    created_at: string
  }
  intakes: ExportedIntakeData[]
  export_generated_at: string
  export_format_version: string
}

/**
 * Export all patient data (for data portability requests)
 */
export async function exportPatientData(patientProfileId?: string): Promise<PatientDataExport | null> {
  const supabase = await createClient()
  const requestingProfile = await getProfile()

  if (!requestingProfile) {
    throw new Error('Not authenticated')
  }

  // Determine which profile to export
  const targetProfileId = patientProfileId || requestingProfile.id

  // Non-admins can only export their own data
  if (targetProfileId !== requestingProfile.id && requestingProfile.role !== 'admin') {
    throw new Error('Not authorized to export this data')
  }

  // Get profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', targetProfileId)
    .single()

  if (!profile) {
    return null
  }

  // Get all intakes with related data
  const { data: intakes } = await supabase
    .from('intakes')
    .select(`
      id,
      reference_number,
      status,
      created_at,
      submitted_at,
      completed_at,
      amount_cents,
      services (name),
      intake_answers (answers),
      consents (consent_type, granted_at, consent_version),
      messages (content, sender_type, created_at, is_internal),
      admin_actions (action_type, notes, created_at),
      attachments (file_name, attachment_type, created_at)
    `)
    .eq('patient_id', targetProfileId)
    .order('created_at', { ascending: false })

  // Format the export
  const exportData: PatientDataExport = {
    profile: {
      full_name: profile.full_name,
      email: profile.email,
      date_of_birth: profile.date_of_birth,
      phone: profile.phone,
      address: profile.address_line_1
        ? `${profile.address_line_1}, ${profile.suburb} ${profile.state} ${profile.postcode}`
        : null,
      created_at: profile.created_at,
    },
    intakes: (intakes || []).map((intake) => ({
      intake: {
        reference_number: intake.reference_number,
        status: intake.status,
        created_at: intake.created_at,
        submitted_at: intake.submitted_at,
        completed_at: intake.completed_at,
        service_name: (intake.services as { name: string })?.name || 'Unknown',
        amount_paid: intake.amount_cents ? intake.amount_cents / 100 : null,
      },
      answers: (intake.intake_answers as { answers: Record<string, unknown> }[])?.[0]?.answers || null,
      consents: ((intake.consents as Array<{
        consent_type: string
        granted_at: string
        consent_version: string
      }>) || []).map((c) => ({
        type: c.consent_type,
        granted_at: c.granted_at,
        version: c.consent_version,
      })),
      messages: ((intake.messages as Array<{
        content: string
        sender_type: string
        created_at: string
        is_internal: boolean
      }>) || [])
        .filter((m) => !m.is_internal) // Exclude internal admin notes
        .map((m) => ({
          content: m.content,
          sender_type: m.sender_type,
          created_at: m.created_at,
        })),
      admin_actions: ((intake.admin_actions as Array<{
        action_type: string
        notes: string | null
        created_at: string
      }>) || []).map((a) => ({
        action_type: a.action_type,
        notes: a.notes,
        created_at: a.created_at,
      })),
      attachments: ((intake.attachments as Array<{
        file_name: string
        attachment_type: string
        created_at: string
      }>) || []).map((a) => ({
        file_name: a.file_name,
        attachment_type: a.attachment_type,
        created_at: a.created_at,
      })),
    })),
    export_generated_at: new Date().toISOString(),
    export_format_version: '1.0',
  }

  // Log the export
  await supabase.rpc('log_audit_event', {
    p_event_type: 'admin_action',
    p_description: 'Patient data exported',
    p_profile_id: targetProfileId,
    p_actor_type: requestingProfile.role === 'admin' ? 'admin' : 'patient',
    p_metadata: {
      exported_by: requestingProfile.id,
      intake_count: exportData.intakes.length,
    },
  })

  return exportData
}

/**
 * Request data deletion (marks for deletion after retention period)
 */
export async function requestDataDeletion(): Promise<{ success: boolean; retentionEndDate: string }> {
  const supabase = await createClient()
  const profile = await getProfile()

  if (!profile) {
    throw new Error('Not authenticated')
  }

  // Get most recent activity date
  const { data: recentIntake } = await supabase
    .from('intakes')
    .select('updated_at')
    .eq('patient_id', profile.id)
    .order('updated_at', { ascending: false })
    .limit(1)
    .single()

  const lastActivity = recentIntake?.updated_at || profile.updated_at
  const retentionEnd = new Date(lastActivity)
  retentionEnd.setFullYear(retentionEnd.getFullYear() + RETENTION_YEARS)

  // Mark profile for deletion
  await supabase
    .from('profiles')
    .update({
      deletion_requested_at: new Date().toISOString(),
      deletion_scheduled_for: retentionEnd.toISOString(),
    })
    .eq('id', profile.id)

  // Log the request
  await supabase.rpc('log_audit_event', {
    p_event_type: 'admin_action',
    p_description: 'Data deletion requested',
    p_profile_id: profile.id,
    p_actor_type: 'patient',
    p_metadata: {
      retention_end_date: retentionEnd.toISOString(),
    },
  })

  return {
    success: true,
    retentionEndDate: retentionEnd.toISOString(),
  }
}

/**
 * Export intake for audit/legal purposes (admin only)
 */
export async function exportIntakeForAudit(intakeId: string): Promise<{
  intake: Record<string, unknown>
  timeline: Array<{ event: string; timestamp: string; details: unknown }>
  exportedAt: string
  exportedBy: string
}> {
  const supabase = await createClient()
  const profile = await getProfile()

  if (!profile || profile.role !== 'admin') {
    throw new Error('Admin access required')
  }

  // Get complete intake with all relations
  const { data: intake } = await supabase
    .from('intakes')
    .select(`
      *,
      profiles!patient_id (*),
      services (*),
      intake_answers (*),
      consents (*),
      messages (*),
      admin_actions (*),
      attachments (*)
    `)
    .eq('id', intakeId)
    .single()

  if (!intake) {
    throw new Error('Intake not found')
  }

  // Get audit log for this intake
  const { data: auditLogs } = await supabase
    .from('audit_log')
    .select('*')
    .eq('intake_id', intakeId)
    .order('created_at', { ascending: true })

  // Build timeline
  const timeline = (auditLogs || []).map((log) => ({
    event: log.event_type,
    timestamp: log.created_at,
    details: {
      description: log.description,
      actor_type: log.actor_type,
      previous_state: log.previous_state,
      new_state: log.new_state,
      client_ip: log.client_ip,
    },
  }))

  // Log this export
  await supabase.rpc('log_audit_event', {
    p_event_type: 'admin_action',
    p_description: 'Intake exported for audit',
    p_intake_id: intakeId,
    p_profile_id: profile.id,
    p_actor_type: 'admin',
  })

  return {
    intake: intake as unknown as Record<string, unknown>,
    timeline,
    exportedAt: new Date().toISOString(),
    exportedBy: profile.full_name,
  }
}
