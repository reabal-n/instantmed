import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/flow/drafts/[id] - Get a specific draft
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: draftId } = await params
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')

    const supabase = await createClient()

    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser()

    // Fetch draft
    const { data, error } = await supabase
      .from('intake_drafts')
      .select('*')
      .eq('id', draftId)
      .single()

    if (error || !data) {
      return NextResponse.json(
        { error: 'Draft not found' },
        { status: 404 }
      )
    }

    // Check ownership
    const isOwner = 
      (user && data.user_id === user.id) ||
      (sessionId && data.session_id === sessionId && !data.user_id)

    if (!isOwner) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Update last accessed
    await supabase
      .from('intake_drafts')
      .update({ last_accessed_at: new Date().toISOString() })
      .eq('id', draftId)

    return NextResponse.json({
      id: data.id,
      sessionId: data.session_id,
      userId: data.user_id,
      serviceSlug: data.service_slug,
      currentStep: data.current_step,
      currentGroupIndex: data.current_group_index,
      data: data.data,
      safetyOutcome: data.safety_outcome,
      safetyRiskTier: data.safety_risk_tier,
      status: data.status,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    })
  } catch (error) {
    console.error('Get draft error:', error)
    return NextResponse.json(
      { error: 'Failed to get draft' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/flow/drafts/[id] - Update a draft
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: draftId } = await params
    const body = await request.json()
    const { sessionId, currentStep, currentGroupIndex, data, safetyOutcome, safetyRiskTier, version } = body

    const supabase = await createClient()

    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser()

    // First check ownership
    const { data: existing, error: fetchError } = await supabase
      .from('intake_drafts')
      .select('session_id, user_id, updated_at')
      .eq('id', draftId)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: 'Draft not found' },
        { status: 404 }
      )
    }

    // Check ownership
    const isOwner = 
      (user && existing.user_id === user.id) ||
      (sessionId && existing.session_id === sessionId && !existing.user_id)

    if (!isOwner) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Build update object
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (currentStep !== undefined) updateData.current_step = currentStep
    if (currentGroupIndex !== undefined) updateData.current_group_index = currentGroupIndex
    if (data !== undefined) updateData.data = data
    if (safetyOutcome !== undefined) updateData.safety_outcome = safetyOutcome
    if (safetyRiskTier !== undefined) updateData.safety_risk_tier = safetyRiskTier

    // Update draft
    const { data: updated, error: updateError } = await supabase
      .from('intake_drafts')
      .update(updateData)
      .eq('id', draftId)
      .select('updated_at')
      .single()

    if (updateError) throw updateError

    return NextResponse.json({
      success: true,
      updatedAt: updated.updated_at,
      serverVersion: new Date(updated.updated_at).getTime(),
    })
  } catch (error) {
    console.error('Update draft error:', error)
    return NextResponse.json(
      { error: 'Failed to update draft' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/flow/drafts/[id] - Delete a draft
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: draftId } = await params
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')

    const supabase = await createClient()

    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser()

    // First check ownership
    const { data: existing, error: fetchError } = await supabase
      .from('intake_drafts')
      .select('session_id, user_id')
      .eq('id', draftId)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: 'Draft not found' },
        { status: 404 }
      )
    }

    // Check ownership
    const isOwner = 
      (user && existing.user_id === user.id) ||
      (sessionId && existing.session_id === sessionId && !existing.user_id)

    if (!isOwner) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Delete draft
    const { error: deleteError } = await supabase
      .from('intake_drafts')
      .delete()
      .eq('id', draftId)

    if (deleteError) throw deleteError

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete draft error:', error)
    return NextResponse.json(
      { error: 'Failed to delete draft' },
      { status: 500 }
    )
  }
}
