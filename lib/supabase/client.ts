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

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    // eslint-disable-next-line no-console
    console.error('[Supabase] Missing environment variables:', { url: !!url, anonKey: !!anonKey })
    throw new Error('Missing Supabase environment variables')
  }

  supabaseClient = createBrowserClientSSR(url, anonKey)

  return supabaseClient
}
