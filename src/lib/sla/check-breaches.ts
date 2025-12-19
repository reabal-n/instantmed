import { createClient } from '@supabase/supabase-js'
import { env } from '@/lib/env'

// ============================================
// SLA BREACH CHECKING (Cron Job / Edge Function)
// ============================================

/**
 * Check for SLA breaches and update statuses
 * This should be called by a cron job or Vercel Edge Function
 * 
 * Vercel cron: Add to vercel.json
 * {
 *   "crons": [{
 *     "path": "/api/cron/check-sla",
 *     "schedule": "* * * * *"
 *   }]
 * }
 */
export async function checkSlaBreaches(): Promise<{
  checked: number
  breached: number
  warned: number
}> {
  // Use service role for cron job
  const supabase = createClient(env.supabaseUrl, env.supabaseServiceRoleKey)
  const now = new Date()

  let checked = 0
  let breached = 0
  let warned = 0

  // 1. Find intakes that have breached SLA but not yet flagged
  const { data: breachedIntakes, error: breachError } = await supabase
    .from('intakes')
    .select('id, reference_number, patient_id, sla_deadline')
    .in('status', ['paid', 'in_review', 'pending_info'])
    .lt('sla_deadline', now.toISOString())
    .eq('sla_breached', false)

  if (breachError) {
    console.error('Error fetching breached intakes:', breachError)
    throw breachError
  }

  checked += breachedIntakes?.length || 0

  // 2. Mark breached intakes
  for (const intake of breachedIntakes || []) {
    const { error: updateError } = await supabase
      .from('intakes')
      .update({ sla_breached: true })
      .eq('id', intake.id)

    if (updateError) {
      console.error(`Failed to mark intake ${intake.id} as breached:`, updateError)
      continue
    }

    // Log audit event
    await supabase.rpc('log_audit_event', {
      p_event_type: 'sla_breached',
      p_description: `SLA deadline breached for intake ${intake.reference_number}`,
      p_intake_id: intake.id,
      p_profile_id: intake.patient_id,
      p_actor_type: 'system',
      p_metadata: {
        sla_deadline: intake.sla_deadline,
        breached_at: now.toISOString(),
      },
    })

    breached++
    console.log(`SLA breached for intake ${intake.reference_number}`)
  }

  // 3. Find intakes approaching SLA (within 15 minutes) that haven't been warned
  const warningThreshold = new Date(now.getTime() + 15 * 60 * 1000)

  const { data: warningIntakes } = await supabase
    .from('intakes')
    .select('id, reference_number, patient_id, sla_deadline')
    .in('status', ['paid', 'in_review', 'pending_info'])
    .lt('sla_deadline', warningThreshold.toISOString())
    .gt('sla_deadline', now.toISOString())
    .eq('sla_warning_sent', false)

  // 4. Send warnings
  for (const intake of warningIntakes || []) {
    const { error: updateError } = await supabase
      .from('intakes')
      .update({ sla_warning_sent: true })
      .eq('id', intake.id)

    if (updateError) {
      console.error(`Failed to mark warning sent for intake ${intake.id}:`, updateError)
      continue
    }

    // Log audit event
    await supabase.rpc('log_audit_event', {
      p_event_type: 'sla_warning',
      p_description: `SLA warning sent for intake ${intake.reference_number}`,
      p_intake_id: intake.id,
      p_actor_type: 'system',
      p_metadata: {
        sla_deadline: intake.sla_deadline,
        warning_sent_at: now.toISOString(),
      },
    })

    warned++

    // TODO: Send notification to admin queue / Slack / etc.
    console.log(`SLA warning sent for intake ${intake.reference_number}`)
  }

  return { checked, breached, warned }
}

/**
 * Get SLA metrics for admin dashboard
 */
export async function getSlaMetrics(): Promise<{
  activeIntakes: number
  breachedCount: number
  atRiskCount: number
  avgTimeToResolution: number
}> {
  const supabase = createClient(env.supabaseUrl, env.supabaseServiceRoleKey)
  const now = new Date()
  const warningThreshold = new Date(now.getTime() + 30 * 60 * 1000)

  // Active intakes in queue
  const { count: activeIntakes } = await supabase
    .from('intakes')
    .select('*', { count: 'exact', head: true })
    .in('status', ['paid', 'in_review', 'pending_info'])

  // Breached intakes
  const { count: breachedCount } = await supabase
    .from('intakes')
    .select('*', { count: 'exact', head: true })
    .in('status', ['paid', 'in_review', 'pending_info'])
    .eq('sla_breached', true)

  // At risk (within 30 minutes of deadline)
  const { count: atRiskCount } = await supabase
    .from('intakes')
    .select('*', { count: 'exact', head: true })
    .in('status', ['paid', 'in_review', 'pending_info'])
    .lt('sla_deadline', warningThreshold.toISOString())
    .gt('sla_deadline', now.toISOString())

  // Average time to resolution (last 7 days)
  const { data: resolvedIntakes } = await supabase
    .from('intakes')
    .select('paid_at, approved_at, declined_at')
    .or('status.eq.approved,status.eq.declined')
    .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    .not('paid_at', 'is', null)

  let avgTimeToResolution = 0
  if (resolvedIntakes && resolvedIntakes.length > 0) {
    const times = resolvedIntakes
      .map((i) => {
        const resolvedAt = i.approved_at || i.declined_at
        if (!i.paid_at || !resolvedAt) return null
        return new Date(resolvedAt).getTime() - new Date(i.paid_at).getTime()
      })
      .filter((t): t is number => t !== null)

    if (times.length > 0) {
      avgTimeToResolution = times.reduce((a, b) => a + b, 0) / times.length / 60000 // Convert to minutes
    }
  }

  return {
    activeIntakes: activeIntakes || 0,
    breachedCount: breachedCount || 0,
    atRiskCount: atRiskCount || 0,
    avgTimeToResolution: Math.round(avgTimeToResolution),
  }
}
