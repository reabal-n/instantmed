import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const saveSummarySchema = z.object({
  intakeId: z.string().uuid(),
  summaryText: z.string(),
  summaryData: z.record(z.unknown()),
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
      .select('id, role')
      .eq('auth_user_id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Parse request
    const body = await request.json()
    const validation = saveSummarySchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.format() },
        { status: 400 }
      )
    }

    const { intakeId, summaryText, summaryData } = validation.data

    // Get current version
    const { data: existingSummaries } = await supabase
      .from('clinical_summaries')
      .select('version')
      .eq('intake_id', intakeId)
      .order('version', { ascending: false })
      .limit(1)

    const nextVersion = existingSummaries && existingSummaries.length > 0
      ? existingSummaries[0].version + 1
      : 1

    // Insert new summary version
    const { data: summary, error } = await supabase
      .from('clinical_summaries')
      .insert({
        intake_id: intakeId,
        version: nextVersion,
        summary_text: summaryText,
        summary_data: summaryData,
        generated_by_id: profile.id,
      })
      .select()
      .single()

    if (error) {
      // Table might not exist yet, create it
      if (error.code === '42P01') {
        // Create table and retry
        await supabase.rpc('create_clinical_summaries_table')
        
        const { data: retryData, error: retryError } = await supabase
          .from('clinical_summaries')
          .insert({
            intake_id: intakeId,
            version: 1,
            summary_text: summaryText,
            summary_data: summaryData,
            generated_by_id: profile.id,
          })
          .select()
          .single()

        if (retryError) {
          console.error('Retry insert error:', retryError)
          return NextResponse.json({ error: 'Failed to save summary' }, { status: 500 })
        }

        return NextResponse.json({ success: true, summary: retryData })
      }

      console.error('Save summary error:', error)
      return NextResponse.json({ error: 'Failed to save summary' }, { status: 500 })
    }

    // Log audit event
    await supabase.rpc('log_audit_event', {
      p_event_type: 'admin_action',
      p_description: `Clinical summary v${nextVersion} saved`,
      p_intake_id: intakeId,
      p_profile_id: profile.id,
      p_actor_type: 'admin',
      p_metadata: { version: nextVersion },
    })

    return NextResponse.json({ success: true, summary })
  } catch (error) {
    console.error('Save summary error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
