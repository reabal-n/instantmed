import type { SupabaseClient } from "@supabase/supabase-js"
import type { NextResponse } from "next/server"
import type Stripe from "stripe"

/**
 * Context passed to every webhook event handler.
 * Keeps handler signatures consistent and avoids threading arguments through deeply.
 */
export interface WebhookContext {
  event: Stripe.Event
  supabase: SupabaseClient
  startTime: number
}

/**
 * Return type for webhook event handlers.
 * - NextResponse: handler wants to send a specific response (error, skip, etc.)
 * - void: handler completed normally; the dispatcher sends { received: true }
 */
export type HandlerResult = NextResponse | void
