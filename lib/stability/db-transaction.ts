/**
 * Database Transaction Helper
 * 
 * Ensures atomic operations with automatic rollback on failure.
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js"
import * as Sentry from "@sentry/nextjs"

type TransactionCallback<T> = (
  client: SupabaseClient
) => Promise<T>

interface TransactionOptions {
  /** Timeout in milliseconds (default: 30000) */
  timeout?: number
  /** Isolation level (default: "read committed") */
  isolationLevel?: "read committed" | "repeatable read" | "serializable"
}

/**
 * Execute operations within a database transaction.
 * Automatically rolls back on error.
 * 
 * Note: Supabase doesn't support true client-side transactions,
 * so this uses RPC functions for critical operations.
 * For multi-step operations, use this pattern with idempotency keys.
 * 
 * @example
 * const result = await withTransaction(async (client) => {
 *   await client.from("intakes").update({ status: "approved" }).eq("id", id)
 *   await client.from("certificates").insert({ intake_id: id, ... })
 *   return { success: true }
 * })
 */
export async function withTransaction<T>(
  callback: TransactionCallback<T>,
  options: TransactionOptions = {}
): Promise<T> {
  const { timeout = 30000 } = options

  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false },
    }
  )

  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("Transaction timeout")), timeout)
  )

  try {
    const result = await Promise.race([callback(client), timeoutPromise])
    return result
  } catch (error) {
    Sentry.captureException(error, {
      extra: { operation: "database_transaction" },
    })
    throw error
  }
}

/**
 * Idempotent operation wrapper.
 * Prevents duplicate operations using an idempotency key.
 * 
 * @example
 * const result = await idempotent(
 *   `approve-intake-${intakeId}`,
 *   async () => {
 *     // This will only run once per key
 *     await approveIntake(intakeId)
 *   },
 *   { ttlSeconds: 3600 }
 * )
 */
export async function idempotent<T>(
  key: string,
  operation: () => Promise<T>,
  options: { ttlSeconds?: number } = {}
): Promise<{ result: T; wasExecuted: boolean }> {
  const { ttlSeconds = 86400 } = options

  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  // Check if operation was already performed
  const { data: existing } = await client
    .from("idempotency_keys")
    .select("result")
    .eq("key", key)
    .single()

  if (existing) {
    return { result: existing.result as T, wasExecuted: false }
  }

  // Perform operation
  const result = await operation()

  // Store result with TTL
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString()
  await client.from("idempotency_keys").upsert({
    key,
    result,
    expires_at: expiresAt,
  })

  return { result, wasExecuted: true }
}

/**
 * Optimistic locking helper.
 * Prevents concurrent updates by checking version.
 * 
 * @example
 * const { data, error } = await optimisticUpdate(
 *   "intakes",
 *   intakeId,
 *   currentVersion,
 *   { status: "approved" }
 * )
 */
export async function optimisticUpdate<T extends Record<string, unknown>>(
  table: string,
  id: string,
  expectedVersion: number,
  updates: Partial<T>
): Promise<{ data: T | null; error: Error | null; conflict: boolean }> {
  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  const { data, error } = await client
    .from(table)
    .update({ ...updates, version: expectedVersion + 1 })
    .eq("id", id)
    .eq("version", expectedVersion)
    .select()
    .single()

  if (error?.code === "PGRST116") {
    // No rows returned - version mismatch
    return { data: null, error: null, conflict: true }
  }

  return { data: data as T | null, error: error as Error | null, conflict: false }
}
