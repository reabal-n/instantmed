import "server-only"
import { createClient, SupabaseClient } from "@supabase/supabase-js"

// Singleton instance for connection pooling
// Prevents connection exhaustion under high load
let serviceClient: SupabaseClient | null = null

// Service role client bypasses RLS - use only in server actions for admin operations
export function createServiceRoleClient(): SupabaseClient {
  // Return existing client if already initialized (connection pooling)
  if (serviceClient) {
    return serviceClient
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl) {
    throw new Error("Missing SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL environment variable")
  }
  if (!serviceRoleKey) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY environment variable")
  }

  serviceClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  return serviceClient
}

/**
 * Create a fresh client instance (use sparingly)
 * Only needed when you must ensure no shared state
 */
export function createFreshServiceRoleClient(): SupabaseClient {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl) {
    throw new Error("Missing SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL environment variable")
  }
  if (!serviceRoleKey) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY environment variable")
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
