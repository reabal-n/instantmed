'use client'

import { createClient } from '@/lib/supabase/client'

/**
 * Flow Authentication Utilities
 * 
 * NOTE: This file provides client-side auth utilities for intake flows.
 * The app uses Clerk for authentication. Use Clerk hooks like useAuth()
 * and useAuth() in React components instead of these functions where possible.
 * 
 * Supabase client is used here ONLY for database operations (drafts), not auth.
 */

// ============================================
// SESSION MANAGEMENT
// ============================================

export interface FlowSession {
  user: { id: string; email: string | null } | null
  isAuthenticated: boolean
  email: string | null
  userId: string | null
}

/**
 * Get current flow session state
 * 
 * NOTE: This is a utility function for internal use in draft operations.
 * For React components, use the useAuth() hook from @clerk/nextjs instead.
 * For server-side auth, use getAuthenticatedUserWithProfile() from @/lib/auth.
 * 
 * This function is used internally by draft functions that need to check
 * user state but cannot use React hooks. It returns unauthenticated state
 * since Clerk auth requires hooks in client components.
 */
export async function getFlowSession(): Promise<FlowSession> {
  // Note: Clerk auth is managed via hooks (useAuth, useAuth) in React components.
  // This utility function is used internally by draft operations that need
  // to check user state but cannot use hooks. Components should use useAuth() directly.
  
  return {
    user: null,
    isAuthenticated: false,
    email: null,
    userId: null,
  }
}

// ============================================
// DRAFT OWNERSHIP
// ============================================

export interface DraftOwnership {
  draftId: string
  sessionId: string
  userId: string | null
  createdAt: string
  lastAccessedAt: string
}

/**
 * Create a new draft with ownership
 */
export async function createDraft(
  sessionId: string,
  serviceSlug: string,
  initialData: Record<string, unknown>
): Promise<{ draftId: string; error?: string }> {
  const supabase = createClient()
  const session = await getFlowSession()

  try {
    const { data, error } = await supabase
      .from('intake_drafts')
      .insert({
        session_id: sessionId,
        user_id: session.userId,
        service_slug: serviceSlug,
        data: initialData,
        status: 'in_progress',
      })
      .select('id')
      .single()

    if (error) throw error

    return { draftId: data.id }
  } catch (err) {
    // eslint-disable-next-line no-console
    if (process.env.NODE_ENV === 'development') console.error('Error creating draft:', err)
    return {
      draftId: '',
      error: err instanceof Error ? err.message : 'Failed to create draft',
    }
  }
}

/**
 * Load a draft and verify ownership
 */
export async function loadDraft(
  draftId: string
): Promise<{
  data: Record<string, unknown> | null
  isOwner: boolean
  error?: string
}> {
  const supabase = createClient()
  const session = await getFlowSession()

  try {
    const { data, error } = await supabase
      .from('intake_drafts')
      .select('*')
      .eq('id', draftId)
      .single()

    if (error) throw error

    // Check ownership
    const isOwner =
      data.user_id === session.userId ||
      data.session_id === localStorage.getItem('instantmed-session-id')

    if (!isOwner) {
      return {
        data: null,
        isOwner: false,
        error: 'You do not have access to this draft',
      }
    }

    // Update last accessed
    await supabase
      .from('intake_drafts')
      .update({ last_accessed_at: new Date().toISOString() })
      .eq('id', draftId)

    return {
      data: data.data as Record<string, unknown>,
      isOwner: true,
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    if (process.env.NODE_ENV === 'development') console.error('Error loading draft:', err)
    return {
      data: null,
      isOwner: false,
      error: err instanceof Error ? err.message : 'Failed to load draft',
    }
  }
}

/**
 * Save draft data
 */
export async function saveDraft(
  draftId: string,
  data: Record<string, unknown>
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient()

  try {
    const { error } = await supabase
      .from('intake_drafts')
      .update({
        data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', draftId)

    if (error) throw error

    return { success: true }
  } catch (err) {
    // eslint-disable-next-line no-console
    if (process.env.NODE_ENV === 'development') console.error('Error saving draft:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to save draft',
    }
  }
}

/**
 * Associate draft with authenticated user
 */
export async function claimDraft(
  draftId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient()

  try {
    const { error } = await supabase
      .from('intake_drafts')
      .update({
        user_id: userId,
        claimed_at: new Date().toISOString(),
      })
      .eq('id', draftId)
      .is('user_id', null) // Only claim if not already claimed

    if (error) throw error

    return { success: true }
  } catch (err) {
    // eslint-disable-next-line no-console
    if (process.env.NODE_ENV === 'development') console.error('Error claiming draft:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to claim draft',
    }
  }
}

/**
 * Get user's incomplete drafts
 */
export async function getUserDrafts(
  limit = 5
): Promise<{
  drafts: Array<{
    id: string
    serviceSlug: string
    createdAt: string
    lastAccessedAt: string
  }>
  error?: string
}> {
  const supabase = createClient()
  const session = await getFlowSession()

  if (!session.isAuthenticated) {
    return { drafts: [] }
  }

  try {
    const { data, error } = await supabase
      .from('intake_drafts')
      .select('id, service_slug, created_at, last_accessed_at')
      .eq('user_id', session.userId)
      .eq('status', 'in_progress')
      .order('last_accessed_at', { ascending: false })
      .limit(limit)

    if (error) throw error

    return {
      drafts: (data || []).map((d: { id: string; service_slug: string; created_at: string; last_accessed_at: string }) => ({
        id: d.id,
        serviceSlug: d.service_slug,
        createdAt: d.created_at,
        lastAccessedAt: d.last_accessed_at,
      })),
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    if (process.env.NODE_ENV === 'development') console.error('Error getting user drafts:', err)
    return {
      drafts: [],
      error: err instanceof Error ? err.message : 'Failed to get drafts',
    }
  }
}

// ============================================
// ROUTE GUARDS
// ============================================

export interface RouteGuardResult {
  allowed: boolean
  redirectTo?: string
  reason?: string
}

/**
 * Check if user can access a protected flow step
 */
export async function checkFlowAccess(
  step: string,
  requiresAuth: boolean,
  draftId?: string
): Promise<RouteGuardResult> {
  const session = await getFlowSession()

  // Check authentication if required
  if (requiresAuth && !session.isAuthenticated) {
    return {
      allowed: false,
      redirectTo: `/start?step=account&returnTo=${encodeURIComponent(step)}`,
      reason: 'Authentication required',
    }
  }

  // Check draft ownership if draftId provided
  if (draftId) {
    const { isOwner, error } = await loadDraft(draftId)
    if (!isOwner) {
      return {
        allowed: false,
        redirectTo: '/start',
        reason: error || 'Draft not found or access denied',
      }
    }
  }

  return { allowed: true }
}

/**
 * Check if user can proceed to checkout
 */
export async function checkCheckoutAccess(
  draftId: string,
  serviceSlug: string
): Promise<RouteGuardResult> {
  const session = await getFlowSession()

  // Must be authenticated for checkout
  if (!session.isAuthenticated) {
    return {
      allowed: false,
      redirectTo: `/start?service=${serviceSlug}&step=account`,
      reason: 'Please sign in to complete your order',
    }
  }

  // Verify draft ownership
  const { isOwner, data } = await loadDraft(draftId)
  if (!isOwner || !data) {
    return {
      allowed: false,
      redirectTo: `/start?service=${serviceSlug}`,
      reason: 'Session expired. Please start again.',
    }
  }

  // Check if safety evaluation passed
  const safetyEval = data._safetyEvaluation as { outcome?: string } | undefined
  if (safetyEval?.outcome && safetyEval.outcome !== 'ALLOW') {
    return {
      allowed: false,
      redirectTo: `/start?service=${serviceSlug}&step=safety`,
      reason: 'Safety check required',
    }
  }

  return { allowed: true }
}

// ============================================
// STATE RESTORATION
// ============================================

/**
 * Restore flow state after authentication
 */
export async function restoreFlowState(
  returnTo?: string | null
): Promise<{
  draftId?: string
  serviceSlug?: string
  step?: string
  redirectUrl: string
}> {
  // Check for pending state in localStorage
  const pendingState = localStorage.getItem('instantmed-pending-flow')

  if (pendingState) {
    try {
      const state = JSON.parse(pendingState)
      localStorage.removeItem('instantmed-pending-flow')

      // Claim the draft if we have a draftId
      if (state.draftId) {
        const session = await getFlowSession()
        if (session.userId) {
          await claimDraft(state.draftId, session.userId)
        }
      }

      return {
        draftId: state.draftId,
        serviceSlug: state.serviceSlug,
        step: state.step,
        redirectUrl: returnTo || `/start?service=${state.serviceSlug}&step=${state.nextStep || 'checkout'}`,
      }
    } catch {
      // Invalid state, clear it
      localStorage.removeItem('instantmed-pending-flow')
    }
  }

  // Default redirect
  return {
    redirectUrl: returnTo || '/start',
  }
}

/**
 * Save flow state before authentication redirect
 */
export function savePendingFlowState(state: {
  draftId?: string
  serviceSlug: string
  step: string
  nextStep: string
  answers: Record<string, unknown>
}): void {
  localStorage.setItem('instantmed-pending-flow', JSON.stringify(state))
}
