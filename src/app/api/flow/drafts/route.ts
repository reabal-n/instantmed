import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/flow/drafts - Create a new draft
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionId, serviceSlug, serviceName, initialData } = body

    if (!sessionId || !serviceSlug) {
      return NextResponse.json(
        { error: 'Missing required fields: sessionId, serviceSlug' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser()

    // Check for existing draft with same session
    const { data: existingDraft } = await supabase
      .from('intake_drafts')
      .select('id')
      .eq('session_id', sessionId)
      .eq('service_slug', serviceSlug)
      .eq('status', 'in_progress')
      .single()

    if (existingDraft) {
      // Return existing draft ID
      return NextResponse.json({ 
        draftId: existingDraft.id,
        isExisting: true,
      })
    }

    // Create new draft
    const { data, error } = await supabase
      .from('intake_drafts')
      .insert({
        session_id: sessionId,
        user_id: user?.id || null,
        service_slug: serviceSlug,
        current_step: 'questionnaire',
        data: initialData || {},
        status: 'in_progress',
      })
      .select('id')
      .single()

    if (error) throw error

    return NextResponse.json({ 
      draftId: data.id,
      isExisting: false,
    })
  } catch (error) {
    console.error('Create draft error:', error)
    return NextResponse.json(
      { error: 'Failed to create draft' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/flow/drafts - Get user's drafts
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')
    const limit = parseInt(searchParams.get('limit') || '10')

    const supabase = await createClient()

    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser()

    // Build query - get drafts by user_id OR session_id
    let query = supabase
      .from('intake_drafts')
      .select('id, session_id, service_slug, current_step, current_group_index, data, created_at, updated_at, last_accessed_at, user_id')
      .eq('status', 'in_progress')
      .order('updated_at', { ascending: false })
      .limit(limit)

    if (user) {
      // Get all drafts for authenticated user
      query = query.eq('user_id', user.id)
    } else if (sessionId) {
      // Get drafts for anonymous session
      query = query.eq('session_id', sessionId).is('user_id', null)
    } else {
      return NextResponse.json({ drafts: [] })
    }

    const { data, error } = await query

    if (error) throw error

    const drafts = (data || []).map(d => ({
      id: d.id,
      sessionId: d.session_id,
      serviceSlug: d.service_slug,
      currentStep: d.current_step,
      currentGroupIndex: d.current_group_index,
      data: d.data,
      createdAt: d.created_at,
      updatedAt: d.updated_at,
      lastAccessedAt: d.last_accessed_at,
      userId: d.user_id,
    }))

    return NextResponse.json({ drafts })
  } catch (error) {
    console.error('Get drafts error:', error)
    return NextResponse.json(
      { error: 'Failed to get drafts' },
      { status: 500 }
    )
  }
}
