/* eslint-disable no-console -- State machine transitions need console for debugging */
import "server-only"
import { createClient } from "@supabase/supabase-js"
import {
  type RequestState,
  canTransition,
  getTransitionTrigger,
  STATE_TO_DB_STATUS,
  STATE_TO_PAYMENT_STATUS,
  STATE_EMAIL_TRIGGERS,
} from "./request-states"

// Service client for server operations
function getServiceClient() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error("Missing Supabase credentials")
  return createClient(url, key)
}

export type TransitionResult = {
  success: boolean
  error?: string
  newState?: RequestState
  emailTriggered?: string
}

export type TransitionParams = {
  requestId: string
  fromState: RequestState
  toState: RequestState
  actorId?: string
  actorType: "patient" | "doctor" | "admin" | "system"
  metadata?: Record<string, unknown>
  ipAddress?: string
  userAgent?: string
}

/**
 * Execute a state transition with audit logging
 */
export async function executeTransition(params: TransitionParams): Promise<TransitionResult> {
  const { requestId, fromState, toState, actorId, actorType, metadata, ipAddress, userAgent } = params

  // Validate transition
  if (!canTransition(fromState, toState)) {
    return {
      success: false,
      error: `Invalid transition from ${fromState} to ${toState}`,
    }
  }

  const supabase = getServiceClient()
  const trigger = getTransitionTrigger(fromState, toState)

  try {
    // Update request status
    const updateData: Record<string, unknown> = {
      status: STATE_TO_DB_STATUS[toState],
      payment_status: STATE_TO_PAYMENT_STATUS[toState],
      updated_at: new Date().toISOString(),
    }

    // Add reviewed_at/reviewed_by for doctor actions
    if (actorType === "doctor" && ["approved", "declined", "needs_info"].includes(toState)) {
      updateData.reviewed_at = new Date().toISOString()
      updateData.reviewed_by = actorId
    }

    const { error: updateError } = await supabase.from("requests").update(updateData).eq("id", requestId)

    if (updateError) {
      // Server-side error logging
      if (process.env.NODE_ENV === 'development') {
        console.error("Error updating request state:", updateError)
      }
      return { success: false, error: updateError.message }
    }

    // Create audit log
    await supabase.from("audit_logs").insert({
      request_id: requestId,
      actor_id: actorId,
      actor_type: actorType,
      action: trigger || "state_change",
      from_state: fromState,
      to_state: toState,
      metadata: metadata || {},
      ip_address: ipAddress,
      user_agent: userAgent,
    })

    // Check if email should be triggered
    const emailTemplate = STATE_EMAIL_TRIGGERS[toState]

    return {
      success: true,
      newState: toState,
      emailTriggered: emailTemplate,
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error("Error executing transition:", error)
    }
    return { success: false, error: "Internal error" }
  }
}

/**
 * Get audit history for a request
 */
export async function getAuditHistory(requestId: string) {
  const supabase = getServiceClient()

  const { data, error } = await supabase
    .from("audit_logs")
    .select("*")
    .eq("request_id", requestId)
    .order("created_at", { ascending: true })

  if (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error("Error fetching audit history:", error)
    }
    return []
  }

  return data
}

/**
 * Infer current state from database values
 */
export function inferState(status: string, paymentStatus: string, scriptSent: boolean): RequestState {
  if (paymentStatus === "pending_payment") {
    return "awaiting_payment"
  }

  if (status === "approved" && scriptSent) {
    return "completed"
  }

  if (status === "approved") {
    return "approved"
  }

  if (status === "declined") {
    return "declined"
  }

  if (status === "needs_follow_up") {
    return "needs_info"
  }

  // Default for paid, pending status
  return "awaiting_review"
}
