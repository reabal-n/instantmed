import { createBrowserClient as createBrowserClientSSR } from "@supabase/ssr"
import type { SupabaseClient } from "@supabase/supabase-js"

export { createBrowserClient } from "@supabase/ssr"

let supabaseClient: SupabaseClient | null = null

// Browser client for use in client components
// Import this in any 'use client' component that needs Supabase
export function createClient() {
  if (supabaseClient) {
    return supabaseClient
  }

  supabaseClient = createBrowserClientSSR(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  return supabaseClient
}
