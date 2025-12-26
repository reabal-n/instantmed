import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * POST /api/flow/drafts/[id]/claim - Claim an anonymous draft for authenticated user
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: draftId } = await params
    const body = await request.json()
    const { sessionId } = body

    const supabase = await createClient()

    // User must be authenticated
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get the draft to claim
    const { data: draft, error: fetchError } = await supabase
      .from('intake_drafts')
      .select('session_id, user_id, service_slug, data')
      .eq('id', draftId)
      .single()

    if (fetchError || !draft) {
      return NextResponse.json(
        { error: 'Draft not found' },
        { status: 404 }
      )
    }

    // Verify session ownership for anonymous drafts
    if (!draft.user_id && draft.session_id !== sessionId) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // If already claimed by this user, return success
    if (draft.user_id === user.id) {
      return NextResponse.json({
        success: true,
        merged: false,
        message: 'Draft already belongs to you',
      })
    }

    // If claimed by another user, error
    if (draft.user_id && draft.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Draft belongs to another user' },
        { status: 403 }
      )
    }

    // Check if user has an existing draft for this service
    const { data: existingUserDraft } = await supabase
      .from('intake_drafts')
      .select('id, data, updated_at')
      .eq('user_id', user.id)
      .eq('service_slug', draft.service_slug)
      .eq('status', 'in_progress')
      .single()

    if (existingUserDraft) {
      // Merge: Keep the newer one, delete the older one
      const existingDate = new Date(existingUserDraft.updated_at).getTime()
      
      // Since we're claiming, the current draft is likely newer (user just filled it)
      // Delete the old user draft and claim this one
      await supabase
        .from('intake_drafts')
        .delete()
        .eq('id', existingUserDraft.id)

      // Claim the current draft
      const { error: claimError } = await supabase
        .from('intake_drafts')
        .update({
          user_id: user.id,
          claimed_at: new Date().toISOString(),
        })
        .eq('id', draftId)

      if (claimError) throw claimError

      return NextResponse.json({
        success: true,
        merged: true,
        message: 'Draft claimed and existing draft replaced',
        previousDraftId: existingUserDraft.id,
      })
    }

    // Simple claim (no existing draft)
    const { error: claimError } = await supabase
      .from('intake_drafts')
      .update({
        user_id: user.id,
        claimed_at: new Date().toISOString(),
      })
      .eq('id', draftId)

    if (claimError) throw claimError

    return NextResponse.json({
      success: true,
      merged: false,
      message: 'Draft claimed successfully',
    })
  } catch (error) {
    console.error('Claim draft error:', error)
    return NextResponse.json(
      { error: 'Failed to claim draft' },
      { status: 500 }
    )
  }
}
