/**
 * Distributed Locking
 * 
 * Prevents concurrent execution of critical operations.
 * Uses database-based locking with automatic expiry.
 */

import { createClient } from "@supabase/supabase-js"
import * as Sentry from "@sentry/nextjs"

export interface LockOptions {
  /** Lock timeout in milliseconds (default: 30000) */
  timeout?: number
  /** Retry attempts if lock is held (default: 3) */
  retries?: number
  /** Delay between retries in ms (default: 1000) */
  retryDelay?: number
}

export interface LockResult {
  acquired: boolean
  lockId?: string
  error?: string
}

/**
 * Acquire a distributed lock
 * 
 * @example
 * const lock = await acquireLock(`approve-intake-${intakeId}`)
 * if (!lock.acquired) {
 *   return { error: "Operation in progress" }
 * }
 * try {
 *   // Do critical work
 * } finally {
 *   await releaseLock(lock.lockId)
 * }
 */
export async function acquireLock(
  key: string,
  options: LockOptions = {}
): Promise<LockResult> {
  const { timeout = 30000, retries = 3, retryDelay = 1000 } = options

  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  const lockId = `${key}-${Date.now()}-${Math.random().toString(36).slice(2)}`
  const expiresAt = new Date(Date.now() + timeout).toISOString()

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Clean up expired locks first
      await client
        .from("distributed_locks")
        .delete()
        .lt("expires_at", new Date().toISOString())

      // Try to acquire lock
      const { error } = await client.from("distributed_locks").insert({
        key,
        lock_id: lockId,
        expires_at: expiresAt,
      })

      if (!error) {
        return { acquired: true, lockId }
      }

      // Lock exists, check if expired
      if (error.code === "23505") {
        // Unique violation - lock held
        if (attempt < retries) {
          await sleep(retryDelay)
          continue
        }
        return { acquired: false, error: "Lock held by another process" }
      }

      throw error
    } catch (error) {
      Sentry.captureException(error, {
        extra: { key, attempt, lockId },
      })

      if (attempt < retries) {
        await sleep(retryDelay)
        continue
      }

      return {
        acquired: false,
        error: error instanceof Error ? error.message : "Lock acquisition failed",
      }
    }
  }

  return { acquired: false, error: "Max retries exceeded" }
}

/**
 * Release a distributed lock
 */
export async function releaseLock(lockId?: string): Promise<boolean> {
  if (!lockId) return false

  try {
    const client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )

    const { error } = await client
      .from("distributed_locks")
      .delete()
      .eq("lock_id", lockId)

    return !error
  } catch {
    return false
  }
}

/**
 * Execute a function with distributed lock
 * 
 * @example
 * const result = await withLock(`payment-${paymentId}`, async () => {
 *   return await processPayment(paymentId)
 * })
 */
export async function withLock<T>(
  key: string,
  fn: () => Promise<T>,
  options: LockOptions = {}
): Promise<{ success: true; data: T } | { success: false; error: string }> {
  const lock = await acquireLock(key, options)

  if (!lock.acquired) {
    return { success: false, error: lock.error || "Could not acquire lock" }
  }

  try {
    const data = await fn()
    return { success: true, data }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Operation failed",
    }
  } finally {
    await releaseLock(lock.lockId)
  }
}

/**
 * Check if a lock is currently held
 */
export async function isLocked(key: string): Promise<boolean> {
  try {
    const client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )

    const { data } = await client
      .from("distributed_locks")
      .select("lock_id")
      .eq("key", key)
      .gt("expires_at", new Date().toISOString())
      .single()

    return !!data
  } catch {
    return false
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Pre-defined lock keys for common operations
 */
export const LOCK_KEYS = {
  intakeApproval: (id: string) => `intake-approval-${id}`,
  certificateGeneration: (id: string) => `cert-gen-${id}`,
  paymentProcessing: (id: string) => `payment-${id}`,
  emailSend: (id: string) => `email-${id}`,
  userOnboarding: (userId: string) => `onboarding-${userId}`,
} as const
